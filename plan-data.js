// Plan de dessus de l'étage (niveau 03). Sans import : testable avec node.
// Hottes = KAP-XXX du plan, nommées par leur Kürzel. Les hottes sans nom restent grises.
export const W = 80;
export const H = 58;

// Même sens que le plan : zones de gauche à droite, en haut puis en bas ; hottes en colonnes verticales.
export const ZONES = [
  { title: 'Synthèse Pestizide', x: 20, y: 50, w: 380, h: 190 },
  { title: 'Eingang', x: 410, y: 50, w: 110, h: 190 },
  { title: 'Chemikalien', x: 530, y: 50, w: 100, h: 190 },
  { title: 'MEL 3/4 Lab', x: 640, y: 50, w: 340, h: 190 },
  { title: 'Purification', x: 20, y: 270, w: 270, h: 310 },
  { title: 'Synthèse Pharma Impurities', x: 300, y: 270, w: 330, h: 310 },
  { title: 'Geräte - Ersatz', x: 640, y: 270, w: 340, h: 310 },
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

// Colonnes verticales : les hottes d'une colonne sont empilées de haut en bas, comme sur le plan.
const column = (nums, x, y0, dy = 68) => nums.map((num, i) => ({ num, x, y: y0 + i * dy }));

const LAYOUT = [
  ...column(['026', '027'], 36, 110), ...column(['028', '029'], 126, 110),
  ...column(['030', '031'], 216, 110), ...column(['032', '033'], 306, 110),
  ...column(['034'], 428, 110),
  ...column(['035', '036'], 660, 110), ...column(['037', '038'], 760, 110), ...column(['039', '040'], 860, 110),
  ...column(['041', '042', '043'], 36, 310), ...column(['044', '045', '046', '047'], 126, 310),
  ...column(['048', '049', '050'], 320, 310), ...column(['051', '052', '053'], 410, 310),
  ...column(['054', '055', '056'], 500, 310),
  ...column(['057', '058'], 660, 310), ...column(['059', '060'], 750, 310), ...column(['061', '062'], 840, 310),
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
