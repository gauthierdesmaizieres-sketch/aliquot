import { t } from './i18n.js';
import { store } from './store.js';
import { app, h, link, button, safeHttp, sheet, topbar, langSwitch, tabs, ghsChips } from './ui.js';
import { POSTES, ZONES, W, H, runningByPoste } from './plan-data.js';

const RUNNING = 'style="--liquid: #2F80ED; --anim: bob 1.8s ease-in-out infinite"';
const IDLE = 'style="--liquid: #CBD5E1"';
const flask = (x, y, running) => `<use href="#flask" x="${x}" y="${y}" width="20" height="26" ${running ? RUNNING : IDLE}/>`;

function planSvg(running) {
  const zones = ZONES.map((z) => `<rect class="zone" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="14"/>`
    + `<text class="z" x="${z.x + 12}" y="${z.y + 22}">${z.title}</text>`).join('');
  const postes = POSTES.map((p) => {
    if (p.slots) {
      const busy = (running[p.id] ?? []).length > 0;
      return `<g class="poste" data-poste="${p.id}">`
        + `<rect class="acc" x="${p.x}" y="${p.y}" width="${W}" height="${H}" rx="10"/>`
        + `<text class="t-acc" x="${p.x + W / 2 - 8}" y="${p.y + 26}">${p.label}</text>`
        + `<text class="t-acc n" x="${p.x + W / 2}" y="${p.y + H - 8}">${p.num}</text>`
        + flask(p.x + W - 24, p.y + 4, busy)
        + '</g>';
    }
    if (!p.label) {
      return `<rect class="off" x="${p.x}" y="${p.y}" width="${W}" height="${H}" rx="10"/>`
        + `<text class="n" x="${p.x + W / 2}" y="${p.y + H / 2 + 4}">${p.num}</text>`;
    }
    return `<rect class="slot" x="${p.x}" y="${p.y}" width="${W}" height="${H}" rx="10"/>`
      + `<text class="t-off" x="${p.x + W / 2}" y="${p.y + 26}">${p.label}</text>`
      + `<text class="n" x="${p.x + W / 2}" y="${p.y + H - 8}">${p.num}</text>`;
  }).join('');
  const legend = flask(20, 600, true) + `<text class="legend" x="48" y="618">${t('running')}</text>`
    + flask(160, 600, false) + `<text class="legend" x="188" y="618">${t('free')}</text>`;
  return `<svg class="plan" viewBox="0 0 1000 630" role="img" aria-label="${t('plan')}">`
    + `<defs><symbol id="flask" viewBox="0 0 60 76">`
    + '<rect x="22" y="2" width="16" height="26" rx="3" fill="#F8FAFC" stroke="#94A3B8" stroke-width="2"/>'
    + '<circle cx="30" cy="52" r="24" fill="#F8FAFC" stroke="#94A3B8" stroke-width="2"/>'
    + '<circle cx="30" cy="56" r="19" fill="var(--liquid)"/>'
    + '<circle cx="23" cy="50" r="3.5" fill="#FFFFFF" fill-opacity="0.85" style="animation: var(--anim)"/>'
    + '<circle cx="36" cy="60" r="2.8" fill="#FFFFFF" fill-opacity="0.85" style="animation: var(--anim)"/>'
    + '<circle cx="30" cy="44" r="2.2" fill="#FFFFFF" fill-opacity="0.85" style="animation: var(--anim)"/>'
    + '</symbol></defs>'
    + zones + postes + legend + '</svg>';
}

function posteSheet(poste, reactions) {
  const row = (r) => h('div', { class: 'card' },
    h('strong', {}, r.code), r.title && h('div', {}, r.title),
    h('div', { class: 'hazards' }, r.hazards.map((k) => h('span', { class: 'hazard' }, t(`hz_${k}`)))),
    r.reagents.filter((x) => x.cas).map((x) => h('div', {}, `${x.name || x.cas} `, ghsChips(x.cas))),
    safeHttp(r.sds_links).map((u) => h('a', { href: u, rel: 'noopener', target: '_blank' }, `SDS : ${new URL(u).hostname}`)),
    link(`#/r/${r.id}`, t('open'), 'btn ghost'));
  const panel = sheet(
    h('h2', {}, poste.label),
    reactions.length ? reactions.map(row) : h('p', { class: 'muted' }, t('noRunning')),
    button(t('close'), () => panel.close(), 'btn ghost'),
  );
}

// QR à coller à l'entrée : il pointe vers le plan de l'adresse où l'app est servie.
function entranceQr() {
  const qr = qrcode(0, 'M');
  qr.addData(`${location.origin}${location.pathname}#/plan`);
  qr.make();
  const code = h('div', { class: 'qr' });
  code.innerHTML = qr.createSvgTag({ scalable: true, margin: 2 }); // SVG généré par la librairie
  const panel = sheet(
    h('h2', {}, t('entranceQr')),
    code,
    h('p', { class: 'muted' }, t('entranceQrHelp')),
    button(t('printLabel'), () => window.print(), 'btn primary'),
    button(t('close'), () => panel.close(), 'btn ghost'),
  );
}

export async function planView() {
  const reactions = await store.listReactions();
  const running = runningByPoste(reactions);
  const frame = h('div', { class: 'plan-wrap' });
  frame.innerHTML = planSvg(running);
  frame.addEventListener('click', (e) => {
    const g = e.target.closest('[data-poste]');
    if (!g) return;
    const poste = POSTES.find((p) => p.id === g.dataset.poste);
    posteSheet(poste, running[poste.id] ?? []);
  });
  app.replaceChildren(
    topbar(h('h1', {}, t('plan')), langSwitch()),
    h('main', {}, tabs('plan'), frame, h('p', { class: 'muted' }, t('planHelp')),
      h('div', { class: 'actions noprint' }, button(t('entranceQr'), entranceQr, 'btn ghost'))),
  );
}
