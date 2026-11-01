import { t } from './i18n.js';
import { store } from './store.js';
import { app, h, button, link, fail, topbar, langSwitch, shrink } from './ui.js';

let timer;
export const stopTransfer = () => clearInterval(timer);

export async function transferHome() {
  store.sweep().catch(() => {}); // shortcut: effacement à la prochaine visite du site ; ajouter une tâche serveur si le site reste longtemps sans visite
  app.replaceChildren(
    topbar(h('h1', {}, t('appName')), langSwitch()),
    h('main', { class: 'transfer-home' },
      h('h2', {}, t('trTitle')),
      h('p', { class: 'muted' }, t('trIntro')),
      button(t('trStart'), () => store.createRoom().then((id) => { location.hash = `#/t/${id}`; }).catch(fail), 'btn primary'),
      link('#/labo', t('labSpace'), 'btn ghost')),
  );
}

function qrBlock(url) {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const box = h('div', { class: 'qr' });
  box.innerHTML = qr.createSvgTag({ scalable: true, margin: 2 }); // SVG généré par la librairie à partir de l'URL
  return h('section', { class: 'tr-qr' }, box, h('p', {}, t('trScan')));
}

function downloadName(i, name) {
  return `photo-${String(i + 1).padStart(2, '0')}.${name.split('.').pop()}`;
}

async function download(url, filename) {
  const blob = await (await fetch(url)).blob();
  h('a', { href: URL.createObjectURL(blob), download: filename }).click();
}

export async function transferRoom(room) {
  const grid = h('div', { class: 'tr-grid' });
  const count = h('p', { class: 'muted', role: 'status' });
  const failed = [];
  const retry = button(t('trRetry'), () => sendAll(failed.splice(0)), 'btn');
  retry.hidden = true;
  let shown = 0;
  let files = [];

  async function refresh() {
    files = await store.roomFiles(room);
    count.textContent = `${files.length} ${t('photos')}`;
    files.slice(shown).forEach((f, i) => {
      const url = store.transferUrl(f.name);
      const name = downloadName(shown + i, f.name);
      grid.append(h('figure', {},
        h('a', { href: url, target: '_blank', rel: 'noopener' }, h('img', { src: url, alt: name, loading: 'lazy' })),
        button(t('trDownload'), () => download(url, name).catch(fail), 'btn')));
    });
    shown = files.length;
  }

  async function sendAll(list) {
    for (const file of list) {
      count.textContent = t('saving');
      try {
        await store.roomUpload(room, await shrink(file, 2600));
      } catch (e) {
        failed.push(file); // la photo reste en mémoire pour réessayer
        fail(e);
      }
    }
    retry.hidden = !failed.length;
    await refresh();
  }

  const pick = (capture) => h('input', {
    type: 'file', accept: 'image/*', multiple: !capture, hidden: true, ...(capture && { capture: 'environment' }),
    onChange: (e) => { const list = [...e.target.files]; e.target.value = ''; sendAll(list).catch(fail); },
  });
  const camera = pick(true);
  const gallery = pick(false);

  const close = button(t('trClose'), async () => {
    if (!confirm(t('trCloseConfirm'))) return;
    stopTransfer();
    await store.closeRoom(room);
    await store.sweep();
    location.hash = '#/';
  }, 'btn ghost danger');

  stopTransfer();
  await refresh();
  app.replaceChildren(
    topbar(h('h1', {}, t('trRoom')), langSwitch()),
    h('main', {},
      qrBlock(location.href),
      h('div', { class: 'actions tr-send' },
        button(`📷 ${t('photo')}`, () => camera.click(), 'btn primary'),
        button(t('trGallery'), () => gallery.click()), retry),
      count, grid, h('p', { class: 'muted' }, t('trExpiry')), close),
    camera, gallery,
  );
  timer = setInterval(() => refresh().catch(stopTransfer), 3000);
}
