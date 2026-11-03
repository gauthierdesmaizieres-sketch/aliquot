// Plan de dessus de l'étage (niveau 03). Sans import : testable avec node.
// Hottes = KAP-XXX du plan, nommées par leur Kürzel. Les hottes sans nom restent grises.
export const W = 84;
export const H = 58;

export const ZONES = [
  { title: 'Synthèse Pestizide', x: 20, y: 50, w: 380, h: 190 },
  { title: 'Eingang', x: 410, y: 50, w: 120, h: 190 },
  { title: 'Chemikalien', x: 540, y: 50, w: 100, h: 190 },
  { title: 'MEL 3/4 Lab', x: 650, y: 50, w: 330, h: 190 },
  { title: 'Purification', x: 20, y: 270, w: 260, h: 300 },
  { title: 'Synthèse Pharma Impurities', x: 300, y: 270, w: 320, h: 200 },
  { title: 'Geräte - Ersatz', x: 640, y: 270, w: 340, h: 200 },
];

// Nom affiché et poste de réaction (id) par numéro de hotte.
const HOODS = {
  '028': { label: 'CRM 028', poste: 'crm-028', slots: 2 },
  '029': { label: 'CRM 029', poste: 'crm-029', slots: 2 },
  '030': { label: 'CRM 030', poste: 'crm-030', slots: 2 },
  '031': { label: 'CRM 031', poste: 'crm-031', slots: 2 },
  '032': { label: 'CRM 032', poste: 'crm-032', slots: 2 },
  '033': { label: 'CRM 033', poste: 'crm-033', slots: 2 },
  '034': { label: 'CRM 034' },
  '035': { label: 'MEL 035', poste: 'mel-035', slots: 2 },
  '036': { label: 'MEL 036', poste: 'mel-036', slots: 2 },
  '042': { label: 'Biotage MPLC' },
  '043': { label: 'Büchi MPLC' },
  '044': { label: 'Färbung' },
  '045': { label: 'Roti 4+5' },
  '046': { label: 'MPLC 1' },
  '047': { label: 'Stehkapelle' },
  '048': { label: 'HV' },
  '049': { label: 'Ultraschallbad' },
  '050': { label: 'Mikrowaage' },
  '051': { label: 'Roti 1' },
  '052': { label: 'Lehrlinge', poste: 'lehrlinge', slots: 2 },
  '053': { label: 'Roti 2+3' },
  '054': { label: 'Mya', poste: 'mya', slots: 4 },
  '055': { label: 'NAl', poste: 'nal', slots: 2 },
  '056': { label: 'DEG', poste: 'deg', slots: 2 },
  '057': { label: 'BAFM', poste: 'bafm', slots: 2 },
  '058': { label: 'WEJ', poste: 'wej', slots: 2 },
  '059': { label: 'Stehkapelle' },
  '060': { label: 'Spül' },
  '061': { label: 'alle', poste: 'alle', slots: 2 },
  '062': { label: 'Probe' },
};

// Positions (x, y) : grilles par zone, comme sur le plan de dessus.
const grid = (nums, x0, y0, cols, dx, dy) => nums.map((num, i) => ({
  num, x: x0 + (i % cols) * dx, y: y0 + Math.floor(i / cols) * dy,
}));

const LAYOUT = [
  ...grid(['026', '027', '028', '029', '030', '031', '032', '033'], 36, 80, 4, 90, 74),
  ...grid(['034'], 428, 110, 1, 0, 0),
  ...grid(['035', '036', '037', '038', '039', '040'], 668, 80, 3, 104, 74),
  ...grid(['041', '042', '043', '044', '045', '046', '047'], 36, 300, 2, 118, 66),
  ...grid(['048', '049', '050', '051', '052', '053'], 318, 300, 3, 100, 80),
  ...grid(['054', '055', '056', '057', '058', '059', '060', '061', '062'], 658, 300, 3, 104, 66),
];

// Liste complète des postes à dessiner (hottes sans nom incluses, sans poste).
export const POSTES = LAYOUT.map(({ num, x, y }) => {
  const hood = HOODS[num] ?? {};
  return { id: hood.poste ?? `hotte-${num}`, num, label: hood.label ?? '', x, y, slots: hood.slots };
});

// Postes de réaction : ballon sur la paillasse, réactions possibles.
export const reactionPostes = () => POSTES.filter((p) => p.slots);
export const posteLabel = (id) => POSTES.find((p) => p.id === id)?.label ?? '';

// Réactions en cours, groupées par poste : { 'alle': [r1, r2], ... }
export function runningByPoste(reactions) {
  const map = {};
  for (const r of reactions) {
    if (r.status !== 'running' || !r.poste) continue;
    (map[r.poste] ??= []).push(r);
  }
  return map;
}
