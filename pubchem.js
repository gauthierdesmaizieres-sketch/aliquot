// Mentions H (GHS) d'un réactif, via PubChem : CAS, référence Sigma-Aldrich ou nom -> CID -> classification GHS.
const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest';
const CAS = /^\d{2,7}-\d{2}-\d$/;
const SIGMA = /^([A-Z]{0,2}\d{3,6})(-\w+)?$/i; // 270997, 270997-1L, D65100
const SIGMA_BRANDS = ['SIAL', 'ALDRICH', 'SIGALD', 'SIGMA', 'FLUKA']; // suffixe des dépôts Sigma-Aldrich dans PubChem

// Extrait les mentions H uniques : { code: 'H225', text: 'Highly flammable liquid and vapor' }.
export function parseGhs(json) {
  const found = new Map();
  const walk = (n) => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (!n || typeof n !== 'object') return;
    (n.StringWithMarkup ?? []).forEach(({ String: s }) => {
      const m = /^(H\d{3})[^:]*:\s*(.+?)\s*(\[|$)/.exec(s);
      if (m && !found.has(m[1])) found.set(m[1], m[2]);
    });
    Object.values(n).forEach(walk);
  };
  walk(json);
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

// Renvoie la liste des mentions H, [] si le produit est introuvable, null si PubChem ne répond pas.
export async function ghsFor(reagent) {
  try {
    const cid = await cidFor(reagent);
    if (!cid) return [];
    const res = await fetch(`${BASE}/pug_view/data/compound/${cid}/JSON?heading=GHS%20Classification`);
    return res.ok ? parseGhs(await res.json()) : res.status === 404 ? [] : null;
  } catch {
    return null;
  }
}
