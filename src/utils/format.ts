const numberFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function pct(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return '-';
  return `${(value * 100).toFixed(digits)}%`;
}

export function num(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return '-';
  return value.toFixed(digits);
}

export function integer(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return Math.round(value).toLocaleString('zh-CN');
}

export function amount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  if (Math.abs(value) >= 1e8) return `${(value / 1e8).toFixed(2)}亿`;
  if (Math.abs(value) >= 1e4) return `${(value / 1e4).toFixed(2)}万`;
  return numberFormatter.format(value);
}

export function compact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return numberFormatter.format(value);
}

export function shortDate(date: string): string {
  return date.slice(0, 7);
}

export function fullDate(date: string): string {
  return date;
}

export function yearLabel(year: number | string): string {
  return `${year}年`;
}

export function factorScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return value.toFixed(2);
}

export function withSign(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return '-';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(digits)}`;
}

export function signedPct(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return '-';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${(value * 100).toFixed(digits)}%`;
}

export function ratio(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return value.toFixed(2);
}
