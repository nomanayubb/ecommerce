export type Place = { name: string; address: string; lat: number; lng: number; href?: string; phone?: string };

/** "31.52, 74.35" -> [31.52, 74.35] (null if it is not a real position). */
export function parseCoords(s: string): [number, number] | null {
  const m = String(s).replace(/[()]/g, "").split(/[,;\s]+/).filter(Boolean).map(Number);
  return m.length >= 2 && m.every(Number.isFinite) && Math.abs(m[0]) <= 90 && Math.abs(m[1]) <= 180 ? [m[0], m[1]] : null;
}
