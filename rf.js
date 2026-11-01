// Positions normalisées de 0 à 1, y = 0 en haut de la photo.
export function rf(baseY, frontY, spotY) {
  const run = baseY - frontY;
  if (!(run > 0)) return null;
  const value = (baseY - spotY) / run;
  if (value < 0 || value > 1) return null;
  return Math.round(value * 100) / 100;
}

export function tlcValues(tlc) {
  if (!tlc?.base || !tlc?.front) return [];
  return (tlc.spots || []).map((s) => rf(tlc.base.y, tlc.front.y, s.y)).filter((v) => v !== null);
}
