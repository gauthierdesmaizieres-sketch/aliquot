import { t, lang, setLang } from './i18n.js';
import { store } from './store.js';
import { ghsFor } from './pubchem.js';

export const app = document.getElementById('app');

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k in el && k !== 'list') el[k] = v; // input.list est en lecture seule
    else el.setAttribute(k, v);
  }
  el.append(...kids.flat().filter((x) => x != null && x !== false));
  return el;
}

export const when = (iso) => new Date(iso).toLocaleString(lang === 'de' ? 'de-CH' : 'fr-CH', { dateStyle: 'short', timeStyle: 'short' });
export const day = (iso) => new Date(iso).toLocaleDateString(lang === 'de' ? 'de-CH' : 'fr-CH');
export const link = (href, label, cls = 'btn') => h('a', { href, class: cls }, label);
export const button = (label, onClick, cls = 'btn') => h('button', { type: 'button', class: cls, onClick }, label);
export const safeHttp = (s) => s.split('\n').map((l) => l.trim()).filter((l) => {
  try { new URL(l); return /^https?:\/\//i.test(l); } catch { return false; } // un lien mal écrit ne doit pas bloquer la page
});

export function toast(msg, cls = '') {
  document.querySelector('.toast')?.remove();
  const el = h('div', { class: `toast ${cls}`, role: 'alert' }, msg);
  document.body.append(el);
  setTimeout(() => el.remove(), 5000);
}
export const fail = (e) => toast(`${t('error')} : ${e.message ?? e}`);

export function field(label, input, help) {
  return h('label', { class: 'field' }, h('span', {}, label), input, help && h('small', {}, help));
}

export function photoImg(path) {
  const img = h('img', { alt: '', loading: 'lazy' });
  store.photoUrl(path).then((u) => { img.src = u; }).catch(fail);
  return img;
}



// Mentions H d'un réactif (PubChem) : chargées quand la pastille entre à l'écran, avec le lien vers la fiche (sauf en liste).
export function ghsChips(reagent, { link = true } = {}) {
  const box = h('div', { class: 'hazards', style: 'min-height: 1.6em' });
  const query = reagent.cas || reagent.name || reagent.ref;
  if (!query) return box;
  const load = () => ghsFor(reagent).then((list) => box.replaceChildren(
    ...(list ? list.map((g) => h('span', { class: 'hazard', title: g.text }, g.code)) : link ? [h('small', {}, t('pubchemDown'))] : []),
    ...(link ? [h('a', { href: `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(query)}`, target: '_blank', rel: 'noopener' }, 'PubChem')] : []),
  ));
  if (!('IntersectionObserver' in window)) { load(); return box; }
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { observer.disconnect(); load(); }
  }, { rootMargin: '150px' });
  observer.observe(box);
  return box;
}

export function sheet(...kids) {
  const el = h('div', { class: 'sheet-wrap' }, h('div', { class: 'sheet' }, ...kids));
  document.body.append(el);
  return { close: () => el.remove() };
}

// Thème choisi à la main (clair / sombre), retenu sur cet appareil ; sinon celui du système.
const dark = () => (document.documentElement.dataset.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
try { const saved = localStorage.getItem('theme'); if (saved) document.documentElement.dataset.theme = saved; } catch {}

function themeSwitch() {
  const btn = h('button', { type: 'button', class: 'btn ghost theme', title: t('theme'), ariaLabel: t('theme') }, dark() ? '☀' : '☾');
  btn.addEventListener('click', () => {
    const next = dark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    btn.textContent = next === 'dark' ? '☀' : '☾';
    try { localStorage.setItem('theme', next); } catch {}
  });
  return btn;
}

export function topbar(left, ...right) {
  const brand = left.tagName === 'H1' ? h('div', { class: 'top-left' }, h('img', { class: 'brand', src: 'icon.svg', alt: '' }), left) : left;
  return h('header', { class: 'top noprint' }, brand, h('div', { class: 'top-right' }, ...right, themeSwitch()));
}

export const homeLink = () => link('#/', `⌂ ${t('home')}`, 'btn ghost');

export function langSwitch() {
  return h('div', { class: 'lang' }, ['fr', 'de'].map((l) => h('button', {
    type: 'button', class: l === lang ? 'on' : '', onClick: () => { setLang(l); dispatchEvent(new HashChangeEvent('hashchange')); },
  }, l.toUpperCase())));
}

// shortcut: pas de file d'attente hors ligne, si l'envoi échoue la feuille reste ouverte pour réessayer ; ajouter une file si le wifi du labo pose problème.
export async function shrink(file, max = 2000) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = h('canvas', { width: Math.round(bmp.width * scale), height: Math.round(bmp.height * scale) });
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', 0.85));
  } catch {
    return file;
  }
}

// Icônes de contour (style Lucide) au-dessus de chaque libellé.
const TAB_ICONS = {
  reactions: '<path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/>',
  plan: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15"/><path d="M15 6v15"/>',
  stock: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  ideas: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
};
const icon = (key) => h('span', { class: 'tab-ico', innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TAB_ICONS[key]}</svg>` });
const tab = (key, label, active, extra = '') => h('a', { href: `#/${key === 'reactions' ? 'labo' : key}`, class: `tab ${active === key ? 'on' : ''} ${extra}` }, icon(key), label);

// Accueil : logo au centre, les onglets autour, et « Recevoir » (photos du téléphone) comme les autres.
export function orbit(receive) {
  return h('div', { class: 'orbit' },
    h('img', { class: 'orb', src: 'icon.svg', alt: '' }),
    tab('reactions', t('reactions'), null, 'o1'),
    tab('plan', t('plan'), null, 'o2'),
    tab('stock', t('stock'), null, 'o3'),
    tab('ideas', t('ideas'), null, 'o4'),
    h('button', { type: 'button', class: 'tab o5', onClick: receive }, icon('camera'), t('receive')));
}

export function tabs(active) {
  return h('nav', { class: 'tabs noprint' },
    h('a', { href: '#/', class: 'tab home', title: t('home'), ariaLabel: t('home') }, '⌂'),
    tab('reactions', t('reactions'), active),
    tab('plan', t('plan'), active),
    tab('stock', t('stock'), active),
    tab('ideas', t('ideas'), active),
    h('a', { href: 'https://gauthierdesmaizieres-sketch.github.io/Kobalt/', target: '_blank', rel: 'noopener', class: 'tab kobalt', title: 'Kobalt' },
      h('img', { src: 'kobalt.png', alt: '' }), 'Kobalt'));
}
