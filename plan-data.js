// Plan de dessus de l'étage (niveau 03). Sans import : testable avec node.
// Hottes = KAP-XXX du plan, nommées par leur Kürzel. Les hottes sans nom restent grises.

// Géométrie relevée sur le PDF « Grundansicht 3.OG » (en pixels du plan rendu à 60 dpi),
// même sens que le plan : x de gauche à droite, y de haut en bas.
// Hottes : [x gauche, x droite, y haut, y bas].
const RECTS = {
  '026': [524, 566, 326, 396], '027': [524, 566, 398, 466],
  '029': [568, 610, 326, 396], '028': [568, 610, 398, 466],
  '030': [694, 736, 326, 396], '031': [694, 736, 398, 466],
  '033': [740, 782, 326, 396], '032': [740, 782, 398, 466],
  '034': [868, 906, 438, 484],
  '035': [1546, 1588, 352, 420], '036': [1546, 1588, 422, 490],
  '038': [1590, 1630, 352, 420], '037': [1590, 1630, 422, 490],
  '039': [1712, 1754, 294, 340], '040': [1712, 1754, 428, 492],
  '041': [916, 952, 712, 766],
  '042': [1036, 1080, 730, 802], '043': [1036, 1080, 858, 928], '044': [1036, 1080, 930, 1000],
  '047': [1082, 1124, 706, 802], '046': [1082, 1124, 858, 928], '045': [1082, 1124, 930, 1000],
  '048': [1194, 1238, 762, 834], '049': [1194, 1238, 834, 904], '050': [1194, 1238, 904, 974],
  '053': [1240, 1284, 762, 834], '052': [1240, 1284, 834, 904], '051': [1240, 1284, 904, 974],
  '054': [1372, 1416, 710, 790], '055': [1372, 1416, 858, 928], '056': [1372, 1416, 930, 1000],
  '059': [1418, 1462, 710, 790], '058': [1418, 1462, 858, 928], '057': [1418, 1462, 930, 1000],
  '060': [1546, 1588, 706, 762], '061': [1546, 1588, 850, 924], '062': [1546, 1588, 926, 998],
};

const TOP = [255, 548];
const BOTTOM = [595, 1058];
const ZONE_RECTS = [
  ['Synthese Pestizide', 400, 908, TOP], ['Eingang / Lager / PSA', 908, 1077, TOP],
  ['Chemikalien', 1077, 1418, TOP], ['MEL 3/4 Lab', 1418, 1756, TOP],
  ['Purification', 910, 1160, BOTTOM], ['Synthese Pharma Impurities', 1160, 1505, BOTTOM],
  ['Geräte - Ersatz', 1505, 1756, BOTTOM],
];
// Couloirs entre les rangées de hottes : [x gauche, x droite, rangée].
const AISLES = [
  [440, 524, TOP], [610, 694, TOP], [782, 868, TOP], [1500, 1546, TOP], [1630, 1712, TOP],
  [952, 1036, BOTTOM], [1124, 1194, BOTTOM], [1288, 1372, BOTTOM], [1462, 1546, BOTTOM], [1588, 1700, BOTTOM],
];
const HALL = [905, 1756, 550, 593]; // couloir central (Laborzone 314)

// Échelle horizontale par morceaux : les hottes sont élargies pour que leur nom tienne,
// les couloirs et les zones sans hotte (Eingang, Chemikalien) sont resserrés.
const XS = [[395, 10], [524, 60], [610, 198], [694, 248], [782, 389], [868, 439], [906, 507], [916, 515],
  [952, 580], [1036, 630], [1124, 771], [1194, 821], [1288, 971], [1372, 1021], [1462, 1165],
  [1546, 1215], [1630, 1349], [1712, 1399], [1754, 1466], [1760, 1472]];
export function X(v) {
  const i = XS.findIndex(([p]) => p >= v);
  if (i === 0) return XS[0][1];
  if (i < 0) return XS.at(-1)[1];
  const [[p0, s0], [p1, s1]] = [XS[i - 1], XS[i]];
  return Math.round(s0 + ((v - p0) * (s1 - s0)) / (p1 - p0));
}
export const Y = (v) => Math.round(40 + (v - 250) * 0.85);
export const VIEW = { w: 1480, h: 790 };

const MIN_H = 52; // petites hottes (TASP 120) agrandies pour lire leur nom
const box = (x0, x1, y0, y1) => ({ x: X(x0), y: Y(y0), w: X(x1) - X(x0), h: Y(y1) - Y(y0) });

export const ZONES = ZONE_RECTS.map(([title, x0, x1, [y0, y1]]) => ({ title, ...box(x0, x1, y0, y1) }));
export const AISLE_BOXES = [
  ...AISLES.map(([x0, x1, [y0, y1]]) => box(x0, x1, y0 + 30, y1 - 6)),
  box(...HALL),
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

// Liste complète des postes à dessiner, par numéro (hottes sans nom incluses, sans poste).
export const POSTES = Object.keys(RECTS).sort().map((num) => {
  const hood = HOODS[num] ?? {};
  const b = box(...RECTS[num]);
  return { id: hood.poste ?? `hotte-${num}`, num, label: hood.label ?? '', ...b, h: Math.max(b.h, MIN_H), slots: hood.slots };
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
