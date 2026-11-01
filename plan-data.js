// Coordonnées reprises du plan SVG (variante B). Sans import : testable avec node.
export const W = 127;
export const H = 34;

export const ZONES = [
  { x: 580, y: 87 }, { x: 580, y: 243 }, { x: 580, y: 406 }, { x: 580, y: 530 },
];

// slots = nombre de places pour une réaction (absent = pas un poste de réaction)
export const POSTES = [
  { id: 'spul', label: 'Spül', x: 609, y: 138 },
  { id: 'alle', label: 'Alle', x: 765, y: 138, slots: 2 },
  { id: 'proben', label: 'Proben', x: 909, y: 138 },
  { id: 'stehkapelle-1', label: 'Stehkapelle', x: 609, y: 243 },
  { id: 'wej', label: 'WEJ', x: 765, y: 243, slots: 2 },
  { id: 'bafm', label: 'BAFM', x: 909, y: 243, slots: 2 },
  { id: 'mya', label: 'Mya', x: 609, y: 294, slots: 4 },
  { id: 'nal', label: 'NAl', x: 765, y: 294, slots: 2 },
  { id: 'deg', label: 'DEG', x: 909, y: 294, slots: 2 },
  { id: 'roti-23', label: 'Roti 2+3', x: 609, y: 406 },
  { id: 'lehrlinge', label: 'Lehrlinge', x: 765, y: 406, slots: 2 },
  { id: 'roti-1', label: 'Roti 1', x: 909, y: 406 },
  { id: 'hv', label: 'HV', x: 609, y: 457 },
  { id: 'us-bad', label: 'US-Bad', x: 765, y: 457 },
  { id: 'waage', label: 'Waage', x: 909, y: 457 },
  { id: 'stehkapelle-2', label: 'Stehkapelle', x: 609, y: 530 },
  { id: 'mplc-1', label: 'MPLC 1', x: 765, y: 530 },
  { id: 'roti-34', label: 'Roti 3+4', x: 909, y: 530 },
  { id: 'mplc-2', label: 'MPLC 2', x: 609, y: 581 },
  { id: 'mplc-3', label: 'MPLC 3', x: 765, y: 581 },
  { id: 'farbung', label: 'Färbung', x: 909, y: 581 },
  { id: 'eingang', label: 'Eingang', x: 355, y: 660 },
];

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
