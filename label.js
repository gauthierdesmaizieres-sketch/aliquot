// Lecture des étiquettes de réactifs : code GS1, puis texte, avec les profils fournisseurs.
const GS = '\x1d';
const FIXED = { '01': 14, 11: 6, 12: 6, 13: 6, 15: 6, 16: 6, 17: 6, 20: 2 };
const VARIABLE = ['10', '21', '22', '30', '240', '241'];

function gs1Date(v) {
  const [y, m, d] = [v.slice(0, 2), v.slice(2, 4), v.slice(4, 6)];
  if (d !== '00') return `20${y}-${m}-${d}`;
  return `20${y}-${m}-${String(new Date(Date.UTC(2000 + +y, +m, 0)).getUTCDate()).padStart(2, '0')}`; // 00 = fin du mois
}

export function parseGs1(raw) {
  const s = raw.replace(/^\][A-Za-z]\d/, '').replace(/\((\d{2,4})\)/g, `${GS}$1`).replace(new RegExp(`^${GS}+`), '');
  const found = {};
  let i = 0;
  while (i < s.length) {
    if (s[i] === GS) { i++; continue; }
    const two = s.slice(i, i + 2);
    const three = s.slice(i, i + 3);
    if (FIXED[two]) {
      found[two] = s.slice(i + 2, i + 2 + FIXED[two]);
      i += 2 + FIXED[two];
    } else if (VARIABLE.includes(two) || VARIABLE.includes(three)) {
      const ai = VARIABLE.includes(three) ? three : two;
      const end = s.indexOf(GS, i);
      found[ai] = s.slice(i + ai.length, end === -1 ? s.length : end);
      i = end === -1 ? s.length : end;
    } else break;
  }
  if (!found['10'] && !found['17'] && !found['01']) return null;
  return { gtin: found['01'] ?? '', lot: found['10'] ?? '', ref: found['240'] ?? '', expiry: found['17'] ? gs1Date(found['17']) : '' };
}

export const GENERIC_KEYS = {
  lot_keys: 'lot number, lot no, lot, batch number, batch no, batch, b/n, l/n',
  ref_keys: 'catalog number, catalog no, cat. no, cat no, product number, product no, item number, item no, art. no, artikel, sku, ref, cat',
  expiry_keys: 'expiry date, expiration date, exp date, expiry, expires, exp, use by, best before, retest date, retest, verfall',
};

export const DEFAULT_SUPPLIERS = [
  ['Sigma-Aldrich', 'sigma, aldrich, merck, supelco, millipore'],
  ['Aaron Chem', 'aaron'],
  ['AAblocks', 'aablocks, aa blocks'],
  ['Ambeed', 'ambeed'],
  ['BLD Pharm', 'bld, bldpharm'],
  ['Combi-Blocks', 'combi-blocks, combi blocks'],
  ['Angene', 'angene'],
  ['ChemScene', 'chemscene'],
  ['TCI', 'tci, tokyo chemical'],
].map(([name, match]) => ({ name, match, lot_keys: '', ref_keys: '', expiry_keys: '' }));

const words = (s) => (s ?? '').split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

export function findSupplier(text, suppliers) {
  return suppliers.find((p) => words(p.match).some((w) => new RegExp(`(^|[^a-z0-9])${escape(w)}($|[^a-z0-9])`, 'i').test(text))) ?? null;
}

// Les mots du profil passent avant les mots génériques, et les plus longs avant les plus courts.
function keys(profile, field) {
  const own = words(profile?.[field]).sort((a, b) => b.length - a.length);
  const generic = words(GENERIC_KEYS[field]).sort((a, b) => b.length - a.length);
  return [...own, ...generic];
}

function afterKey(text, list, accept) {
  for (const key of list) {
    const re = new RegExp(`(?:^|[^a-z0-9])${escape(key)}\\s*(?:no\\.?|n°|#)?[\\s:.#]*([A-Z0-9][A-Z0-9_./-]{2,})`, 'gi');
    for (const m of text.matchAll(re)) if (accept(m[1])) return m[1].replace(/[.,]$/, '');
  }
  return '';
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const iso = (y, m, d) => {
  const day = d ?? new Date(Date.UTC(+y, +m, 0)).getUTCDate(); // mois seul = fin du mois
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// shortcut: 03/04/2027 est lu jour/mois (format européen) ; ajouter un format par profil si un fournisseur écrit mois/jour.
export function parseDate(s) {
  let m;
  if ((m = s.match(/\b(20\d{2})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?\b/))) return iso(m[1], +m[2], m[3] && +m[3]);
  if ((m = s.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/))) return iso(m[3], +m[2], +m[1]);
  if ((m = s.match(/\b(\d{1,2})[-/.](20\d{2})\b/))) return iso(m[2], +m[1]);
  if ((m = s.match(/\b([A-Za-z]{3})[a-z]*[ .-]+(20\d{2})\b/)) && MONTHS[m[1].toLowerCase()]) return iso(m[2], MONTHS[m[1].toLowerCase()]);
  return '';
}

function expiryAfterKey(text, list) {
  for (const key of list) {
    for (const m of text.matchAll(new RegExp(`(?:^|[^a-z0-9])${escape(key)}\\s*[:.]?\\s*(.{0,24})`, 'gi'))) {
      const date = parseDate(m[1]);
      if (date) return date;
    }
  }
  return '';
}

export function parseText(text, suppliers) {
  const profile = findSupplier(text, suppliers);
  const hasDigit = (v) => /\d/.test(v);
  return {
    supplier: profile?.name ?? '',
    lot: afterKey(text, keys(profile, 'lot_keys'), hasDigit),
    ref: afterKey(text, keys(profile, 'ref_keys'), hasDigit),
    expiry: expiryAfterKey(text, keys(profile, 'expiry_keys')),
    cas: text.match(/\b\d{2,7}-\d{2}-\d\b/)?.[0] ?? '', // format fixe, pas besoin de profil
  };
}

// Après une correction : le mot juste avant la bonne valeur devient un mot repère du fournisseur.
export function learnKey(text, value) {
  const at = text.toLowerCase().indexOf(value.toLowerCase());
  if (at < 1) return '';
  const m = text.slice(0, at).match(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ/.]+)[\s:.#]*$/);
  return m ? m[1].toLowerCase() : '';
}

export function expiryState(date, now = new Date()) {
  if (!date) return '';
  const days = (new Date(date) - now) / 86400000;
  return days < 0 ? 'expired' : days < 60 ? 'soon' : '';
}

export const coaName = (r, ext = 'pdf') => `${[r.ref, r.lot, 'CoA'].filter(Boolean).join('_').replace(/[^\w.-]+/g, '-')}.${ext}`;
