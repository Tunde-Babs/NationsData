/** Compact number formatting helpers shared across feature pages. */

export function compact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(n);
}

export function full(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en').format(n);
}

export function usd(n: number | null | undefined, compactMode = true): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'USD',
    notation: compactMode ? 'compact' : 'standard',
    maximumFractionDigits: compactMode ? 1 : 0
  }).format(n);
}

export function area(km2: number | null | undefined): string {
  if (!km2) return '—';
  return `${full(Math.round(km2))} km²`;
}

export function density(pop: number, km2: number): string {
  if (!pop || !km2) return '—';
  return `${full(Math.round(pop / km2))} /km²`;
}
