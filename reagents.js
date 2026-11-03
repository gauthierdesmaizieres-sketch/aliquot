import { t } from './i18n.js';
import { store } from './store.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { app, h, day, link, button, fail, field, photoImg, sheet, topbar, langSwitch, shrink, tabs, toast } from './ui.js';
import { parseGs1, parseText, learnKey, expiryState, coaName, DEFAULT_SUPPLIERS } from './label.js';

// Le fichier wasm reste chez nous : aucune image ne quitte le téléphone pour la lecture.
ZXingWASM.setZXingModuleOverrides({ locateFile: (p, prefix) => (p.endsWith('.wasm') ? new URL(`vendor/${p}`, location.href).href : prefix + p) });

async function suppliers() {
  const rows = await store.list('suppliers');
  if (rows.length) return rows;
  return Promise.all(DEFAULT_SUPPLIERS.map((s) => store.save('suppliers', s)));
}

async function readCode(file) {
  const found = await ZXingWASM.readBarcodes(file, { formats: ['DataMatrix', 'QRCode', 'Code128', 'GS1DataBar'], tryHarder: true });
  for (const b of found) {
    const parsed = parseGs1(b.text);
    if (parsed) return parsed;
  }
  return null;
}

let ocr;
async function readText(blob) {
  ocr ??= Tesseract.createWorker('eng'); // modèle téléchargé une fois ; le texte est lu sur l'appareil
  return (await (await ocr).recognize(blob)).data.text;
}

// Lecture par IA de vision, côté serveur (connexion d'équipe obligatoire) ; repli sur l'OCR si elle échoue.
async function visionRead(blob) {
  const token = await store.accessToken();
  if (!token) throw new Error('connexion requise pour la lecture IA');
  const image = await new Promise((res) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
  const res = await fetch(`${SUPABASE_URL}/functions/v1/read-label`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image }),
  });
  if (!res.ok) throw new Error(`lecture IA : ${await res.text()}`);
  return res.json();
}

function fillEmpty(r, found, inputs) {
  for (const k of ['product', 'supplier', 'ref', 'lot', 'expiry', 'cas']) {
    if (found[k] && !r[k]) {
      r[k] = found[k];
      inputs[k].value = found[k];
    }
  }
}

export async function reagentListView() {
  const rows = await store.list('reagents');
  const results = h('div', {});
  const draw = (q = '') => {
    const needle = q.toLowerCase();
    const shown = rows.filter((r) => [r.product, r.supplier, r.ref, r.lot, r.cas].join(' ').toLowerCase().includes(needle));
    results.replaceChildren(...(shown.length ? shown.map(card) : [h('p', { class: 'muted' }, t('noReagents'))]));
  };
  const card = (r) => {
    const state = expiryState(r.expiry);
    return h('a', { class: 'card', href: `#/reagent/${r.id}` },
      h('div', { class: 'card-top' }, h('strong', {}, r.product || r.ref || '—'), state && h('span', { class: `pill ${state}` }, t(state))),
      h('small', {}, [r.supplier, r.ref, r.lot && `Lot ${r.lot}`, r.expiry && day(r.expiry)].filter(Boolean).join(' · ')));
  };
  app.replaceChildren(
    topbar(h('h1', {}, t('stock')), langSwitch()),
    h('main', {}, tabs('stock'),
      h('div', { class: 'actions' }, link('#/reagent/new', t('scan'), 'btn primary'),
        rows.length > 0 && button(t('export'), () => exportReagents(rows)),
        link('#/suppliers', t('profiles'), 'btn ghost')),
      h('input', { type: 'search', placeholder: t('search'), ariaLabel: t('search'), onInput: (e) => draw(e.target.value) }),
      results),
  );
  draw();
}

function exportReagents(rows) {
  const data = rows.map((r) => ({
    [t('product')]: r.product, [t('supplier')]: r.supplier, [t('ref')]: r.ref, [t('reagentCas')]: r.cas, [t('lot')]: r.lot,
    [t('expiry')]: r.expiry ? day(r.expiry) : '', [t('location')]: r.location, [t('noteText')]: r.note, CoA: r.coa_path ? '✓' : '',
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), t('stock'));
  XLSX.writeFile(wb, `reactifs-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function reagentFormView(existing) {
  const r = existing ?? { product: '', supplier: '', ref: '', cas: '', lot: '', expiry: null, location: '', note: '', photos: [], coa_path: null };
  const profiles = await suppliers();
  const stock = await store.list('reagents');
  const pending = [];
  let lastText = '';
  let readLot = '';
  const inputs = {};
  const input = (k, props = {}) => (inputs[k] = h('input', { value: r[k] ?? '', onInput: (e) => { r[k] = e.target.value; }, ...props }));
  const thumbs = h('div', { class: 'thumbs' }, r.photos.map(photoImg));
  const status = h('p', { class: 'muted', role: 'status' });

  // Plusieurs photos d'un même flacon : chaque lecture ne complète que les champs encore vides.
  async function read(file) {
    status.textContent = t('reading');
    const blob = await shrink(file);
    pending.push(blob);
    thumbs.append(h('img', { alt: '', src: URL.createObjectURL(blob) }));
    try {
      const code = await readCode(file);
      if (code) fillEmpty(r, code, inputs);
      const ai = await visionRead(blob).catch((e) => { fail(e); return null; });
      if (ai) {
        fillEmpty(r, ai, inputs);
        lastText = ''; // pas de texte OCR : l'apprentissage du fournisseur ne s'applique pas
      } else {
        lastText = await readText(blob);
        fillEmpty(r, parseText(lastText, profiles), inputs);
      }
      readLot = r.lot;
      const known = stock.find((x) => x.ref && x.ref === r.ref && x.product);
      if (known && !r.product) { r.product = known.product; inputs.product.value = known.product; }
      status.textContent = t('readDone');
    } catch (e) {
      status.textContent = ''; // la photo reste, on complète à la main
      fail(e);
    }
  }

  const camera = h('input', {
    type: 'file', accept: 'image/*', capture: 'environment', hidden: true,
    onChange: (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) read(f); },
  });

  const maybeLearn = async () => {
    const profile = profiles.find((p) => p.name === r.supplier);
    if (!profile || !lastText || !r.lot || r.lot === readLot) return;
    const word = learnKey(lastText, r.lot);
    if (word && confirm(t('learn').replace('{w}', word).replace('{s}', profile.name))) {
      await store.save('suppliers', { ...profile, lot_keys: [profile.lot_keys, word].filter(Boolean).join(', ') });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button.primary');
    btn.disabled = true;
    try {
      for (const blob of pending.splice(0)) r.photos.push(await store.upload(blob, 'reagents', 'jpg'));
      await maybeLearn();
      const saved = await store.save('reagents', { ...r, expiry: r.expiry || null });
      location.hash = `#/reagent/${saved.id}`;
    } catch (err) {
      fail(err); // le formulaire reste ouvert, on peut réessayer
      btn.disabled = false;
    }
  };

  app.replaceChildren(
    topbar(link(r.id ? `#/reagent/${r.id}` : '#/stock', `‹ ${t('back')}`, 'btn ghost')),
    h('main', {}, h('form', { class: 'stack', onSubmit: submit },
      h('h1', {}, r.id ? t('edit') : t('newReagent')),
      thumbs, status,
      button(`📷 ${t('morePhoto')}`, () => camera.click(), 'btn'),
      field(t('product'), input('product')),
      field(t('supplier'), input('supplier', { list: 'supplier-list' })),
      h('datalist', { id: 'supplier-list' }, profiles.map((p) => h('option', { value: p.name }))),
      field(t('ref'), input('ref')),
      field(t('reagentCas'), input('cas')),
      field(t('lot'), input('lot')),
      field(t('expiry'), input('expiry', { type: 'date' })),
      field(t('location'), input('location')),
      field(t('noteText'), input('note')),
      h('button', { class: 'btn primary' }, t('save')))),
    camera,
  );
}

async function sendCoa(r) {
  const blob = await store.download(r.coa_path);
  const ext = r.coa_path.split('.').pop();
  const file = new File([blob], coaName(r, ext.length <= 4 ? ext : 'pdf'), { type: blob.type });
  const text = [r.product, r.ref && `${t('ref')} ${r.ref}`, r.lot && `Lot ${r.lot}`].filter(Boolean).join(' | ');
  if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file], title: file.name, text });
  h('a', { href: URL.createObjectURL(file), download: file.name }).click();
  await navigator.clipboard.writeText(text);
  toast(t('sent'), 'ok');
}

export async function reagentDetailView(id) {
  const r = await store.get('reagents', id);
  const reload = () => reagentDetailView(id).catch(fail);
  const state = expiryState(r.expiry);
  const row = (label, value) => value && h('div', { class: 'safety-row' }, h('span', {}, label), h('strong', {}, value));
  const picker = h('input', {
    type: 'file', accept: 'application/pdf,image/*', hidden: true,
    onChange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const old = r.coa_path;
        const coa_path = await store.upload(file, 'coa', file.name.split('.').pop().toLowerCase());
        await store.save('reagents', { ...r, coa_path });
        if (old) await store.removeFiles([old]);
        await reload();
      } catch (err) { fail(err); }
    },
  });
  const openCoa = async () => window.open(URL.createObjectURL(await store.download(r.coa_path)), '_blank');
  app.replaceChildren(
    topbar(link('#/stock', `‹ ${t('stock')}`, 'btn ghost'), link(`#/reagent-edit/${id}`, t('edit'), 'btn ghost')),
    h('main', {},
      h('h1', {}, r.product || r.ref || '—'),
      state && h('div', { class: 'actions' }, h('span', { class: `pill ${state}` }, t(state))),
      row(t('supplier'), r.supplier), row(t('ref'), r.ref), row(t('reagentCas'), r.cas), row(t('lot'), r.lot),
      row(t('expiry'), r.expiry && day(r.expiry)), row(t('location'), r.location), row(t('noteText'), r.note),
      r.photos.length > 0 && h('div', { class: 'thumbs' }, r.photos.map(photoImg)),
      h('h2', {}, t('coa')),
      !r.coa_path && h('p', { class: 'muted' }, t('noCoa')),
      h('div', { class: 'actions' },
        r.coa_path && button(t('sendCoa'), () => sendCoa(r).catch(fail), 'btn primary'),
        r.coa_path && button(t('openCoa'), () => openCoa().catch(fail)),
        button(t('addCoa'), () => picker.click())),
      button(t('delete'), async () => {
        if (!confirm(t('confirmDelete'))) return;
        await store.removeFiles([...r.photos, r.coa_path].filter(Boolean));
        await store.remove('reagents', id);
        location.hash = '#/stock';
      }, 'btn ghost danger')),
    picker,
  );
}

export async function suppliersView() {
  const rows = await suppliers();
  const edit = (p) => {
    const row = { ...p };
    const input = (k) => h('input', { value: row[k] ?? '', onInput: (e) => { row[k] = e.target.value; } });
    const s = sheet(
      field(t('supplier'), input('name')),
      field(t('matchWords'), input('match')),
      field(t('lotKeys'), input('lot_keys'), t('keysHelp')),
      field(t('refKeys'), input('ref_keys')),
      field(t('expiryKeys'), input('expiry_keys')),
      h('div', { class: 'actions' },
        button(t('save'), () => store.save('suppliers', row).then(() => { s.close(); return suppliersView(); }).catch(fail), 'btn primary'),
        button(t('cancel'), () => s.close()),
        row.id && button(t('delete'), () => {
          if (confirm(t('confirmDelete'))) store.remove('suppliers', row.id).then(() => { s.close(); return suppliersView(); }).catch(fail);
        }, 'btn ghost danger')));
  };
  app.replaceChildren(
    topbar(link('#/stock', `‹ ${t('stock')}`, 'btn ghost')),
    h('main', {}, h('h1', {}, t('profiles')),
      h('div', { class: 'actions' }, button(`+ ${t('addSupplier')}`, () => edit({ name: '', match: '', lot_keys: '', ref_keys: '', expiry_keys: '' }))),
      rows.sort((a, b) => a.name.localeCompare(b.name)).map((p) => button(p.name, () => edit(p), 'card'))),
  );
}
