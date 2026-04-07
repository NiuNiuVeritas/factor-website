import { FACTOR_LABELS } from './colors';
import type {
  CompositeMetricRow,
  PortfolioIndustryWeightRow,
  PortfolioTargetRow,
  PriceVersion,
  RangePreset,
} from '../types';

export const STRATEGY_OPTIONS = [
  { value: 'fixed_combo', label: '\u56fa\u5b9a\u56e0\u5b50\u7ec4\u5408' },
] as const;

export const VERSION_OPTIONS = [
  { value: 'close_version', label: '\u6708\u672b\u6536\u76d8\u8c03\u4ed3' },
  { value: 'open_version', label: '\u6708\u521d\u5f00\u76d8\u8c03\u4ed3' },
] as const;

export const RANGE_OPTIONS = [
  { value: 'full', label: '\u5168\u533a\u95f4' },
  { value: '10y', label: '\u8fd1 10 \u5e74' },
  { value: '5y', label: '\u8fd1 5 \u5e74' },
  { value: '3y', label: '\u8fd1 3 \u5e74' },
  { value: '1y', label: '\u8fd1 1 \u5e74' },
] as const;

export function factorLabel(factor: string): string {
  return FACTOR_LABELS[factor] ?? factor;
}

export function industryLabel(industry: string): string {
  return industry;
}

export function parseDate(date: string): number {
  return new Date(date).getTime();
}

export function compareDate(a: string, b: string): number {
  return parseDate(a) - parseDate(b);
}

export function uniqueDates<T extends { date: string }>(rows: T[]): string[] {
  return [...new Set(rows.map((row) => row.date))].sort(compareDate);
}

export function lastDateOf<T extends { date: string }>(rows: T[]): string {
  const dates = uniqueDates(rows);
  return dates[dates.length - 1] ?? '';
}

export function startDateForPreset(lastDate: string, preset: RangePreset): string {
  if (preset === 'full' || !lastDate) return '1900-01-01';
  const years =
    preset === '10y' ? 10 : preset === '5y' ? 5 : preset === '3y' ? 3 : 1;
  const base = new Date(lastDate);
  return `${base.getFullYear() - years}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
}

export function filterByRange<T extends { date: string }>(
  rows: T[],
  preset: RangePreset,
  lastDate: string,
): T[] {
  if (!rows.length || preset === 'full') return rows;
  const start = parseDate(startDateForPreset(lastDate, preset));
  return rows.filter((row) => parseDate(row.date) >= start);
}

export function filterByVersion<T extends { ver: PriceVersion }>(
  rows: T[],
  version: PriceVersion,
): T[] {
  return rows.filter((row) => row.ver === version);
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function average(values: number[]): number {
  if (!values.length) return 0;
  return sum(values) / values.length;
}

export function calcSharpe(returns: number[]): number {
  if (returns.length < 2) return 0;
  const mean = average(returns);
  const variance =
    average(returns.map((item) => (item - mean) ** 2)) || Number.EPSILON;
  return (mean / Math.sqrt(variance)) * Math.sqrt(12);
}

export function calcAnnualizedReturn(
  firstNav: number,
  lastNav: number,
  months: number,
): number {
  if (!months || firstNav <= 0 || lastNav <= 0) return 0;
  return (lastNav / firstNav) ** (12 / months) - 1;
}

export function calcMaxDrawdown(values: number[]): number {
  if (!values.length) return 0;
  let peak = values[0];
  let maxDrawdown = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    maxDrawdown = Math.min(maxDrawdown, value / peak - 1);
  }
  return maxDrawdown;
}

export function getCompositeGroups(metric: CompositeMetricRow | undefined): number[] {
  return metric?.groups ?? [];
}

export function aggregateIndustryWeights(rows: PortfolioIndustryWeightRow[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.date}__${row.industry}__${row.ver}`;
    map.set(key, (map.get(key) ?? 0) + row.weight);
  }

  return [...map.entries()].map(([key, weight]) => {
    const [date, industry, ver] = key.split('__');
    return {
      date,
      industry: industryLabel(industry),
      ver: ver as PriceVersion,
      weight,
    };
  });
}

export function aggregateCurrentIndustries(rows: PortfolioTargetRow[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const name = industryLabel(row.industry);
    map.set(name, (map.get(name) ?? 0) + row.weight);
  }
  return [...map.entries()]
    .map(([industry, weight]) => ({ industry, weight }))
    .sort((a, b) => b.weight - a.weight);
}
