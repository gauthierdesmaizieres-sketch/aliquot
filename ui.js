import { t, lang, setLang } from './i18n.js';
import { store } from './store.js';

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
export const safeHttp = (s) => s.split('\n').map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l));

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



export function sheet(...kids) {
  const el = h('div', { class: 'sheet-wrap' }, h('div', { class: 'sheet' }, ...kids));
  document.body.append(el);
  return { close: () => el.remove() };
}

export function topbar(left, ...right) {
  return h('header', { class: 'top noprint' }, left, h('div', { class: 'top-right' }, ...right));
}

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

export function tabs(active) {
  return h('nav', { class: 'tabs noprint' },
    link('#/labo', t('reactions'), `tab ${active === 'reactions' ? 'on' : ''}`),
    link('#/plan', t('plan'), `tab ${active === 'plan' ? 'on' : ''}`),
    link('#/stock', t('stock'), `tab ${active === 'stock' ? 'on' : ''}`));
}
