// Mentions H (GHS) d'un réactif, via PubChem : numéro CAS -> CID -> classification GHS.
const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest';
const CAS = /^\d{2,7}-\d{2}-\d$/;

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

// Renvoie la liste des mentions H, [] si le CAS est inconnu, null si PubChem ne répond pas.
export async function ghsByCas(cas) {
  if (!CAS.test(cas)) return [];
  try {
    const idRes = await fetch(`${BASE}/pug/compound/name/${cas}/cids/TXT`);
    if (!idRes.ok) return [];
    const cid = (await idRes.text()).trim().split('\n')[0];
    const res = await fetch(`${BASE}/pug_view/data/compound/${cid}/JSON?heading=GHS%20Classification`);
    return res.ok ? parseGhs(await res.json()) : null;
  } catch {
    return null;
  }
}
