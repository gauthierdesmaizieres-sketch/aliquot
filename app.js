import { t, STEPS, HAZARDS, COLORS } from './i18n.js';
import { store, isDemo, newReaction } from './store.js';
import { tlcValues, rf } from './rf.js';
import { app, h, when, day, link, button, safeHttp, fail, field, photoImg, sheet, topbar, langSwitch, shrink, tabs, ghsChips, toast } from './ui.js';
import { ghsFor, hazardKeys } from './pubchem.js';

const NIGHT = ['Argon', 'Rührer', 'Heizbad', 'Vakuumpumpe', 'Lyophilisator', 'Thermostat', 'Kühlwasser', 'Mya-Gerät'];
import { transferHome, transferRoom, stopTransfer } from './transfer.js';
import { reagentListView, reagentFormView, reagentDetailView, suppliersView } from './reagents.js';
import { planView } from './plan.js';
import { ideasView } from './ideas.js';
import { reactionPostes, posteLabel } from './plan-data.js';

// Marques CCM en pourcentages, pour rester justes à toutes les tailles d'image.
function drawMarks(box, tlc) {
  box.querySelectorAll('.mark').forEach((m) => m.remove());
  if (!tlc) return;
  if (tlc.base) box.append(h('div', { class: 'mark line base', style: `top:${tlc.base.y * 100}%` }));
  if (tlc.front) box.append(h('div', { class: 'mark line front', style: `top:${tlc.front.y * 100}%` }));
  for (const s of tlc.spots ?? []) {
    const value = tlc.base && tlc.front ? rf(tlc.base.y, tlc.front.y, s.y) : null;
    box.append(h('div', { class: 'mark spot', style: `left:${s.x * 100}%;top:${s.y * 100}%` }, h('b', {}, value ?? '?')));
  }
}

function plate(entry) {
  const box = h('div', { class: 'plate' }, photoImg(entry.photo_path));
  drawMarks(box, entry.tlc);
  return box;
}

function loginView() {
  const email = h('input', { type: 'email', autocomplete: 'email' });
  const password = h('input', { type: 'password', autocomplete: 'current-password' });
  const message = h('p', { class: 'notice', role: 'status', hidden: true });
  const creds = () => [email.value.trim(), password.value];
  app.replaceChildren(
    h('main', { class: 'login' }, h('h1', {}, t('appName')), langSwitch(), message,
      field(t('email'), email),
      field(t('password'), password),
      button(t('signIn'), () => store.signIn(...creds()).then(route).catch(fail), 'btn primary'),
      button(t('signUp'), () => store.signUp(...creds()).then(() => {
        message.textContent = t('confirmSent');
        message.hidden = false;
      }).catch(fail))),
  );
}

async function listView() {
  const [reactions, entries] = await Promise.all([store.listReactions(), store.allEntries()]);
  const count = (id) => entries.filter((e) => e.reaction_id === id && e.photo_path).length;
  const row = (r) => h('a', { class: 'card', href: `#/r/${r.id}` },
    h('div', { class: 'card-top' }, h('strong', {}, r.code), h('span', { class: `pill ${r.status}` }, t(r.status))),
    r.title && h('div', {}, r.title),
    h('small', {}, `${day(r.created_at)} · ${count(r.id)} ${t('photos').toLowerCase()}`));
  const sorted = [...reactions].sort((a, b) => (a.status === b.status ? 0 : a.status === 'running' ? -1 : 1));
  app.replaceChildren(
    topbar(h('h1', {}, t('reactions')), langSwitch(), !isDemo && button(t('signOut'), () => store.signOut().then(route).catch(fail), 'btn ghost')),
    h('main', {},
      isDemo && h('p', { class: 'notice' }, t('demo')),
      tabs('reactions'),
      h('div', { class: 'actions' }, link('#/new', t('newReaction'), 'btn primary'),
        reactions.length > 0 && button(t('export'), () => exportExcel(reactions, entries))),
      sorted.length ? sorted.map(row) : h('p', { class: 'muted' }, t('noReactions'))),
  );
}

function exportExcel(reactions, entries) {
  const rows = reactions.map((r) => {
    const own = entries.filter((e) => e.reaction_id === r.id);
    return {
      [t('codeLabel')]: r.code,
      [t('title')]: r.title,
      [t('status')]: t(r.status),
      [t('start')]: day(r.created_at),
      [t('reagents')]: r.reagents.map((x) => [x.name, x.lot && `Lot ${x.lot}`, x.ref].filter(Boolean).join(' ')).join(' ; '),
      [t('hazards')]: r.hazards.map((k) => t(`hz_${k}`)).join(', '),
      [t('responsible')]: r.responsible,
      [t('responsible2')]: r.responsible2,
      [t('photos')]: own.filter((e) => e.photo_path).length,
      [`${t('tlc')} Rf`]: own.flatMap((e) => tlcValues(e.tlc)).join(', '),
    };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), t('reactions'));
  XLSX.writeFile(wb, `reactions-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function formView(r, stock, team) {
  r.night ??= [];
  const input = (key, props = {}) => h('input', { value: r[key] ?? '', onInput: (e) => { r[key] = e.target.value; }, ...props });
  const area = (key) => h('textarea', { rows: 3, value: r[key] ?? '', onInput: (e) => { r[key] = e.target.value; } });
  const list = h('div', { class: 'stack' });
  const drawReagents = () => list.replaceChildren(...r.reagents.map((x, i) => h('div', { class: 'reagent' },
    ['name', 'lot', 'ref', 'cas'].map((k) => h('input', {
      placeholder: t({ name: 'reagentName', lot: 'reagentLot', ref: 'reagentRef', cas: 'reagentCas' }[k]), ariaLabel: k, value: x[k] ?? '',
      onInput: (e) => { x[k] = e.target.value; },
    })),
    button('×', () => { r.reagents.splice(i, 1); drawReagents(); }, 'btn ghost'))));
  drawReagents();
  const hazards = h('div', { class: 'chips' }, HAZARDS.map((k) => h('button', {
    type: 'button', class: `chip ${r.hazards.includes(k) ? 'on' : ''}`,
    onClick: (e) => {
      r.hazards = r.hazards.includes(k) ? r.hazards.filter((x) => x !== k) : [...r.hazards, k];
      e.target.classList.toggle('on');
    },
  }, t(`hz_${k}`))));
  const fillHazards = button(t('hazardsPubchem'), async () => {
    fillHazards.disabled = true;
    const lists = await Promise.all(r.reagents.map(ghsFor));
    fillHazards.disabled = false;
    const found = hazardKeys(lists.flat().filter(Boolean).map((g) => g.code));
    r.hazards = [...new Set([...r.hazards, ...found])];
    hazards.querySelectorAll('.chip').forEach((c, i) => c.classList.toggle('on', r.hazards.includes(HAZARDS[i])));
    toast(lists.includes(null) ? t('pubchemDown') : `${t('hazardsFound')} : ${found.map((k) => t(`hz_${k}`)).join(', ') || '—'}`);
  }, 'btn ghost');
  const person = (key) => field(t(key), h('select', { onChange: (e) => { r[key] = e.target.value; } },
    h('option', { value: '' }, t('choosePerson')),
    [...new Set([...team, r[key]].filter(Boolean))].map((m) => h('option', { value: m, selected: r[key] === m }, m))));
  // Tableau de surveillance de nuit : une ligne par appareil en marche.
  const nightRows = NIGHT.map((item) => {
    const get = () => r.night.find((n) => n.item === item);
    const pick = (key, opts) => h('select', {
      ariaLabel: `${item} : ${t(`night_${key}`)}`, disabled: !get(), onChange: (e) => { get()[key] = e.target.value; },
    }, opts.map((o) => h('option', { value: o, selected: get()?.[key] === o }, t(`n_${o}`))));
    const control = pick('control', ['yes', 'no']);
    const action = pick('action', ['off', 'call']);
    const on = h('input', {
      type: 'checkbox', checked: !!get(), onChange: (e) => {
        r.night = e.target.checked ? [...r.night, { item, control: control.value, action: action.value }] : r.night.filter((n) => n.item !== item);
        control.disabled = action.disabled = !e.target.checked;
      },
    });
    return h('div', { class: 'night-row' }, h('label', {}, on, ` ${item}`), control, action);
  });
  // Ctrl+V : les captures collées sont ajoutées comme notes après l'enregistrement.
  const shots = [];
  const thumbs = h('div', { class: 'strip' });
  const paste = async (e) => {
    if (!thumbs.isConnected) return document.removeEventListener('paste', paste);
    const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
    if (!item) return;
    const blob = await shrink(item.getAsFile());
    shots.push(blob);
    const fig = h('figure', { class: 'shot' }, h('img', { class: 'preview', alt: t('pastedShot'), src: URL.createObjectURL(blob) }),
      h('button', { type: 'button', class: 'btn ghost danger', ariaLabel: t('delete'), onClick: () => { shots.splice(shots.indexOf(blob), 1); fig.remove(); } }, '×'));
    thumbs.append(fig);
  };
  document.addEventListener('paste', paste);
  const submit = async (e) => {
    e.preventDefault();
    r.reagents = r.reagents.filter((x) => x.name || x.lot || x.ref || x.cas);
    if (!r.end_planned) r.end_planned = null;
    try {
      r.id = (await store.saveReaction(r)).id; // un nouvel essai après une erreur met à jour la même réaction
      while (shots.length) {
        await store.addEntry({ reaction_id: r.id, step: 'setup', note: '', color: '' }, shots[0]);
        shots.shift();
      }
      location.hash = `#/r/${r.id}`;
    } catch (err) {
      fail(err);
    }
  };
  app.replaceChildren(
    topbar(link(r.id ? `#/r/${r.id}` : '#/labo', `‹ ${t('back')}`, 'btn ghost')),
    h('main', {}, h('form', { class: 'stack', onSubmit: submit },
      h('h1', {}, r.id ? t('edit') : t('newReaction')),
      field(t('codeLabel'), input('code', { required: true, placeholder: 'GD-042' })),
      field(t('title'), input('title')),
      h('p', { class: 'muted' }, t('pasteHint')), thumbs,
      field(t('poste'), h('select', { onChange: (e) => { r.poste = e.target.value; } },
        h('option', { value: '' }, t('choosePoste')),
        reactionPostes().map((p) => h('option', { value: p.id, selected: r.poste === p.id }, p.label)))),
      h('h2', {}, t('reagents')), list,
      button(`+ ${t('addReagent')}`, () => { r.reagents.push({}); drawReagents(); }),
      stock.length > 0 && h('select', {
        ariaLabel: t('fromStock'),
        onChange: (e) => {
          const x = stock[e.target.value];
          r.reagents.push({ name: x.product, lot: x.lot, ref: x.ref });
          e.target.selectedIndex = 0;
          drawReagents();
        },
      }, h('option', { value: '' }, t('fromStock')), stock.map((x, i) => h('option', { value: i }, [x.product, x.lot].filter(Boolean).join(' · ')))),
      h('h2', {}, t('safety')),
      h('div', { class: 'field' }, h('span', {}, t('hazards')), hazards, fillHazards),
      field(t('extinguisher'), input('extinguisher'), t('extinguisherHelp')),
      field(t('instructions'), area('instructions')),
      h('details', { class: 'field night', open: r.night.length > 0 }, h('summary', {}, t('night')),
        h('div', { class: 'night-row muted' }, h('span', {}, t('night_on')), h('span', {}, t('night_control')), h('span', {}, t('night_action'))),
        nightRows),
      person('responsible'),
      person('responsible2'),
      field(t('phone'), input('phone', { type: 'tel' })),
      field(t('endPlanned'), input('end_planned', { type: 'date' })),
      field(t('sdsLinks'), area('sds_links')),
      field(t('checkedBy'), input('checked_by')),
      h('button', { class: 'btn primary' }, t('save')))),
  );
}

function entrySheet(reaction, blob, lastStep, reload) {
  const entry = { reaction_id: reaction.id, step: lastStep, note: '', color: '' };
  const preview = blob && h('img', { class: 'preview', alt: '', src: URL.createObjectURL(blob) });
  const steps = h('div', { class: 'chips' }, STEPS.map((k) => h('button', {
    type: 'button', class: `chip ${k === entry.step ? 'on' : ''}`,
    onClick: (e) => {
      entry.step = k;
      steps.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
      e.target.classList.add('on');
    },
  }, t(`step_${k}`))));
  const color = h('input', { onInput: (e) => { entry.color = e.target.value; } });
  const colors = h('div', { class: 'chips' }, COLORS.map((k) => button(t(`c_${k}`), () => {
    color.value = color.value ? `${color.value} → ${t(`c_${k}`).toLowerCase()}` : t(`c_${k}`);
    entry.color = color.value;
  }, 'chip')));
  const note = h('textarea', { rows: 2, onInput: (e) => { entry.note = e.target.value; } });
  const saveBtn = button(t('save'), async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = t('saving');
    try {
      const row = await store.addEntry(entry, blob);
      s.close();
      await reload();
      if (row.step === 'tlc' && row.photo_path) rfEditor(row, reload);
    } catch (e) {
      fail(e); // la feuille reste ouverte : la photo n'est pas perdue et on peut réessayer
      saveBtn.disabled = false;
      saveBtn.textContent = t('save');
    }
  }, 'btn primary');
  const s = sheet(preview, field(t('step'), steps), h('div', { class: 'field' }, h('span', {}, t('color')), colors, color),
    field(t('noteText'), note), h('div', { class: 'actions' }, saveBtn, button(t('cancel'), () => s.close())));
}

function rfEditor(entry, reload) {
  const tlc = entry.tlc ? structuredClone(entry.tlc) : { spots: [] };
  let mode = !tlc.base ? 'base' : !tlc.front ? 'front' : 'spot';
  const modes = { base: 'tlcBase', front: 'tlcFront', spot: 'tlcSpot' };
  const box = plate(entry);
  const tabs = h('div', { class: 'chips' });
  const out = h('p', { class: 'rf-out' });
  const redraw = () => {
    drawMarks(box, tlc);
    tabs.replaceChildren(...Object.keys(modes).map((m) => button(t(modes[m]), () => { mode = m; redraw(); }, `chip ${m === mode ? 'on' : ''}`)));
    out.textContent = tlcValues(tlc).length ? `Rf : ${tlcValues(tlc).join(' · ')}` : '';
  };
  box.addEventListener('click', (e) => {
    const b = box.getBoundingClientRect();
    const p = { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height };
    if (mode === 'spot') tlc.spots.push(p);
    else {
      tlc[mode] = p;
      mode = mode === 'base' ? 'front' : 'spot';
    }
    redraw();
  });
  const s = sheet(h('p', { class: 'muted' }, t('tlcHelp')), tabs, box, out, h('div', { class: 'actions' },
    button(t('save'), () => store.updateEntry(entry.id, { tlc }).then(() => { s.close(); return reload(); }).catch(fail), 'btn primary'),
    button(t('undo'), () => { tlc.spots.pop(); redraw(); }),
    button(t('cancel'), () => s.close())));
  redraw();
}

function entryCard(reaction, e, reload, printable = false) {
  const values = tlcValues(e.tlc);
  return h('article', { class: 'entry' },
    h('div', { class: 'entry-head' }, h('b', {}, t(`step_${e.step}`)), h('small', {}, when(e.taken_at))),
    e.photo_path && (e.tlc ? plate(e) : h('div', { class: 'plate' }, photoImg(e.photo_path))),
    e.color && h('p', {}, h('span', { class: 'muted' }, `${t('color')} : `), e.color),
    e.note && h('p', {}, e.note),
    values.length > 0 && h('p', { class: 'rf-out' }, `Rf : ${values.join(' · ')}`),
    !printable && h('div', { class: 'actions' },
      e.step === 'tlc' && e.photo_path && button(t('measureRf'), () => rfEditor(e, reload)),
      button(t('delete'), () => {
        if (confirm(t('confirmDelete'))) store.deleteEntry(e).then(reload).catch(fail);
      }, 'btn ghost danger')));
}

async function detailView(id) {
  const reaction = await store.getReaction(id);
  const reload = () => detailView(id).catch(fail);
  const entries = await store.listEntries(id);
  const plates = entries.filter((e) => e.step === 'tlc' && e.photo_path);
  const lastStep = entries.at(-1)?.step ?? 'setup';
  const camera = h('input', {
    type: 'file', accept: 'image/*', capture: 'environment', hidden: true,
    onChange: async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (file) entrySheet(reaction, await shrink(file), lastStep, reload);
    },
  });
  // Ctrl+V : une capture d'écran collée devient une note de la réaction ; l'écouteur s'arrête quand on quitte la page.
  const paste = async (e) => {
    if (!camera.isConnected) return document.removeEventListener('paste', paste);
    const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
    if (item) entrySheet(reaction, await shrink(item.getAsFile()), lastStep, reload);
  };
  document.addEventListener('paste', paste);
  const toggle = () => store.saveReaction({ ...reaction, status: reaction.status === 'running' ? 'done' : 'running' }).then(reload).catch(fail);
  app.replaceChildren(
    topbar(link('#/labo', `‹ ${t('reactions')}`, 'btn ghost'), link(`#/edit/${id}`, t('edit'), 'btn ghost')),
    h('main', { class: 'with-fab' },
      h('h1', {}, reaction.code), reaction.title && h('p', {}, reaction.title),
      reaction.poste && h('p', { class: 'muted' }, `${t('poste')} : ${posteLabel(reaction.poste)}`),
      h('div', { class: 'actions' },
        h('span', { class: `pill ${reaction.status}` }, t(reaction.status)),
        link(`#/report/${id}`, t('report')), link(`#/label/${id}`, t('label')),
        button(reaction.status === 'running' ? t('markDone') : t('markRunning'), toggle, 'btn ghost')),
      reaction.reagents.length > 0 && h('section', {}, h('h2', {}, t('reagents')), h('ul', {}, reaction.reagents.map((x) => h('li', {}, [x.name, x.lot && `Lot ${x.lot}`, x.ref].filter(Boolean).join(' · '), ghsChips(x))))),
      plates.length > 1 && h('section', {}, h('h2', {}, t('tlcCompare')),
        h('div', { class: 'strip' }, plates.map((e) => h('figure', {}, plate(e), h('figcaption', {}, when(e.taken_at)))))),
      h('h2', {}, t('timeline')),
      entries.length ? entries.map((e) => entryCard(reaction, e, reload)) : h('p', { class: 'muted' }, t('noEntries')),
      button(t('delete'), () => {
        if (confirm(t('confirmDelete'))) store.deleteReaction(id).then(() => { location.hash = '#/labo'; }).catch(fail);
      }, 'btn ghost danger')),
    h('div', { class: 'fab noprint' },
      button(t('note'), () => entrySheet(reaction, null, lastStep, reload)),
      button(`📷 ${t('photo')}`, () => camera.click(), 'btn primary')),
    camera,
  );
}

async function reportView(id) {
  const [r, entries] = await Promise.all([store.getReaction(id), store.listEntries(id)]);
  app.replaceChildren(
    topbar(link(`#/r/${id}`, `‹ ${t('back')}`, 'btn ghost'), button(t('printPdf'), () => window.print(), 'btn primary')),
    h('main', { class: 'report' }, h('h1', {}, r.code), r.title && h('p', {}, r.title),
      h('p', { class: 'muted' }, `${day(r.created_at)} · ${t(r.status)}`),
      r.reagents.length > 0 && h('ul', {}, r.reagents.map((x) => h('li', {}, [x.name, x.lot && `Lot ${x.lot}`, x.ref].filter(Boolean).join(' · ')))),
      entries.map((e) => entryCard(r, e, null, true))),
  );
}

function safetyBlock(r) {
  const row = (label, value) => h('div', { class: 'safety-row' }, h('span', {}, label), h('strong', {}, value || t('empty')));
  return [
    h('div', { class: 'hazards' }, r.hazards.map((k) => h('span', { class: 'hazard' }, t(`hz_${k}`)))),
    row(t('extinguisher'), r.extinguisher),
    row(t('instructions'), r.instructions),
    row(t('responsible'), [r.responsible, r.phone].filter(Boolean).join(' · ')),
    r.responsible2 && row(t('responsible2'), r.responsible2),
    r.night?.length > 0 && h('div', { class: 'safety-row' }, h('span', {}, t('night')), h('ul', {}, r.night.map((n) => h('li', {},
      `${n.item} · ${t('night_control')} : ${t(`n_${n.control}`)} · ${t('night_action')} : ${t(`n_${n.action}`)}`)))),
    r.end_planned && row(t('endPlanned'), day(r.end_planned)),
    !r.checked_by ? h('p', { class: 'draft' }, t('draft')) : row(t('checkedBy'), r.checked_by),
  ];
}

async function labelView(id) {
  const r = await store.getReaction(id);
  const qr = qrcode(0, 'M');
  qr.addData(`${location.origin}${location.pathname}#/s/${r.qr_token}`);
  qr.make();
  const code = h('div', { class: 'qr' });
  code.innerHTML = qr.createSvgTag({ scalable: true, margin: 2 }); // SVG généré par la librairie à partir de l'URL
  app.replaceChildren(
    topbar(link(`#/r/${id}`, `‹ ${t('back')}`, 'btn ghost'), button(t('printLabel'), () => window.print(), 'btn primary')),
    h('main', {}, h('div', { class: 'label' }, h('h1', {}, r.code), ...safetyBlock(r), code, h('small', {}, t('scanQr')))),
  );
}

async function safetyView(token) {
  const r = await store.safety(token);
  app.replaceChildren(topbar(h('h1', {}, t('safetySheet')), langSwitch()),
    h('main', {}, !r ? h('p', {}, t('notFound')) : [
      h('h2', {}, r.code), ...safetyBlock(r),
      safeHttp(r.sds_links).map((u) => h('p', {}, h('a', { href: u, rel: 'noopener', target: '_blank' }, `SDS : ${new URL(u).hostname}`))),
      h('p', { class: 'muted' }, t('safetyNotice')),
    ]));
}

async function route() {
  const [, page, arg] = location.hash.split('/');
  stopTransfer();
  try {
    if (page === 's') return await safetyView(arg);
    if (page === 't') return await transferRoom(arg);
    if (!page) return await transferHome();
    const user = await store.session();
    if (!user) return loginView();
    if (!user.allowed) return app.replaceChildren(h('main', { class: 'login' }, h('p', {}, t('notAllowed')), button(t('signOut'), () => store.signOut().then(route), 'btn')));
    if (page === 'new') return formView(newReaction(), await store.list('reagents'), await store.teamMembers());
    if (page === 'edit') return formView(await store.getReaction(arg), await store.list('reagents'), await store.teamMembers());
    if (page === 'stock') return await reagentListView();
    if (page === 'reagent') return arg === 'new' ? await reagentFormView() : await reagentDetailView(arg);
    if (page === 'reagent-edit') return await reagentFormView(await store.get('reagents', arg));
    if (page === 'suppliers') return await suppliersView();
    if (page === 'r') return await detailView(arg);
    if (page === 'report') return await reportView(arg);
    if (page === 'plan') return await planView();
    if (page === 'ideas') return ideasView();
    if (page === 'label') return await labelView(arg);
    await listView();
  } catch (e) {
    fail(e);
  }
}

addEventListener('hashchange', route);
route();
