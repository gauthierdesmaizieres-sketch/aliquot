// Mentions H (GHS) d'un réactif, via PubChem : CAS, référence Sigma-Aldrich ou nom -> CID -> classification GHS.
const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest';
const CAS = /^\d{2,7}-\d{2}-\d$/;
const SIGMA = /^([A-Z]{0,2}\d{3,6})(-\w+)?$/i; // 270997, 270997-1L, D65100
const SIGMA_BRANDS = ['SIAL', 'ALDRICH', 'SIGALD', 'SIGMA', 'FLUKA']; // suffixe des dépôts Sigma-Aldrich dans PubChem

const EU = /ECHA|1272\/2008/; // classification européenne (CLP), reprise en Suisse
const MIN_SHARE = 25; // % des déclarants ECHA ; en dessous, mention rare (souvent impureté ou autre forme)

// Extrait les mentions H uniques : { code: 'H225', text: 'Highly flammable liquid and vapor' }.
// Si PubChem a des sources européennes, on ne garde qu'elles, et seulement les mentions partagées par ≥ 25 % des déclarants.
export function parseGhs(json) {
  const sources = Object.fromEntries((json?.Record?.Reference ?? []).map((r) => [r.ReferenceNumber, r.SourceName ?? '']));
  const all = [];
  const walk = (n, ref) => {
    if (Array.isArray(n)) return n.forEach((x) => walk(x, ref));
    if (!n || typeof n !== 'object') return;
    const here = n.ReferenceNumber ?? ref;
    (n.StringWithMarkup ?? []).forEach(({ String: s }) => {
      const m = /^(H\d{3})(?:\s*\(>?\s*([\d.]+)\s*%\))?[^:]*:\s*(.+?)\s*(\[|$)/.exec(s);
      if (m) all.push({ code: m[1], share: m[2] ? +m[2] : 100, text: m[3], eu: EU.test(sources[here] ?? '') });
    });
    Object.values(n).forEach((v) => walk(v, here));
  };
  walk(json);
  const kept = all.some((x) => x.eu) ? all.filter((x) => x.eu && x.share >= MIN_SHARE) : all;
  const found = new Map();
  kept.forEach((x) => { if (!found.has(x.code)) found.set(x.code, x.text); });
  return [...found].map(([code, text]) => ({ code, text }));
}

// Mention H -> pictogramme (clés de HAZARDS dans i18n.js).
const RANGES = [
  [200, 205, 'explosive'], [240, 240, 'explosive'], [220, 228, 'flammable'], [241, 242, 'flammable'], [250, 261, 'flammable'],
  [270, 272, 'oxidizer'], [280, 281, 'gas'], [290, 290, 'corrosive'], [314, 314, 'corrosive'], [318, 318, 'corrosive'],
  [300, 301, 'toxic'], [310, 311, 'toxic'], [330, 331, 'toxic'], [302, 302, 'irritant'], [312, 312, 'irritant'],
  [315, 317, 'irritant'], [319, 319, 'irritant'], [332, 332, 'irritant'], [335, 336, 'irritant'],
  [304, 305, 'health'], [334, 334, 'health'], [340, 373, 'health'], [400, 413, 'environment'],
];
export function hazardKeys(codes) {
  const keys = codes.flatMap((c) => RANGES.filter(([a, b]) => +c.slice(1) >= a && +c.slice(1) <= b).map(([, , k]) => k));
  return [...new Set(keys)];
}

const firstCid = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('inconnu');
  return (await res.text()).trim().split('\n')[0];
};

// Réactif { cas, ref, name } -> CID, en essayant le CAS, puis la référence Sigma-Aldrich, puis le nom.
async function cidFor({ cas = '', ref = '', name = '' }) {
  const tries = [];
  if (CAS.test(cas.trim())) tries.push(() => firstCid(`${BASE}/pug/compound/name/${cas.trim()}/cids/TXT`));
  const sigma = SIGMA.exec(ref.trim())?.[1];
  if (sigma) tries.push(() => Promise.any(SIGMA_BRANDS.map((b) => firstCid(`${BASE}/pug/substance/sourceid/Sigma-Aldrich/${sigma}_${b}/cids/TXT`))));
  if (name.trim()) tries.push(() => firstCid(`${BASE}/pug/compound/name/${encodeURIComponent(name.trim())}/cids/TXT`));
  for (const go of tries) {
    try { return await go(); } catch {}
  }
  return null;
}

// État physique d'après la première description PubChem (« … appears as a clear colorless liquid »).
const STATES = [[/liquid|solution/i, 'stLiquid'], [/solid|powder|crystal/i, 'stSolid'], [/\bgas/i, 'stGas']];
export function parseState(json) {
  const first = JSON.stringify(json).match(/"String":"([^"]*)"/)?.[1] ?? '';
  const hits = STATES.map(([re, key]) => ({ key, at: first.search(re) })).filter((x) => x.at >= 0);
  return hits.sort((a, b) => a.at - b.at)[0]?.key ?? '';
}

// Clé d'état (stLiquid, stSolid, stGas) ou '' si inconnu. Une requête PubChem de plus que ghsFor.
export async function stateFor(reagent) {
  try {
    const cid = await cidFor(reagent);
    if (!cid) return '';
    const res = await fetch(`${BASE}/pug_view/data/compound/${cid}/JSON?heading=Physical%20Description`);
    return res.ok ? parseState(await res.json()) : '';
  } catch {
    return '';
  }
}

async function lookupGhs(reagent) {
  try {
    const cid = await cidFor(reagent);
    if (!cid) return [];
    const res = await fetch(`${BASE}/pug_view/data/compound/${cid}/JSON?heading=GHS%20Classification`);
    return res.ok ? parseGhs(await res.json()) : res.status === 404 ? [] : null;
  } catch {
    return null;
  }
}

// Renvoie la liste des mentions H, [] si le produit est introuvable, null si PubChem ne répond pas.
// Résultat gardé dans le navigateur : un produit n'est demandé qu'une fois. Un échec n'est jamais gardé.
export async function ghsFor(reagent) {
  const key = 'pubchem:ghs:' + JSON.stringify([reagent.cas, reagent.ref, reagent.name].map((s) => (s ?? '').trim().toLowerCase()));
  try {
    const hit = localStorage.getItem(key);
    if (hit) return JSON.parse(hit);
  } catch {}
  const list = await lookupGhs(reagent);
  if (list) try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
  return list;
}
