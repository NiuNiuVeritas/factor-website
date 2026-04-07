export type PriceVersion = 'close_version' | 'open_version';
export type StrategyKey = 'fixed_combo';
export type RangePreset = 'full' | '10y' | '5y' | '3y' | '1y';
export type PageKey =
  | 'overview'
  | 'universe'
  | 'factors'
  | 'composite'
  | 'performance'
  | 'holdings';

export interface MetaData {
  date_range: [string, string];
  n_periods: number;
  factors: string[];
  factor_labels?: Record<string, string>;
  benchmark: string;
  n_stocks: number;
  buy_fee: number;
  sell_fee: number;
  weight_cap: number;
}

export interface UniverseRow {
  date: string;
  size: number;
}

export interface SingleFactorMetricRow {
  factor: string;
  label: string;
  rankic_mean: number;
  rankic_win_rate: number;
  annualized_rankicir: number;
  long_excess: number;
  groups: number[];
}

export interface SingleFactorRankicRow {
  date: string;
  factor: string;
  rankic: number | null;
  count: number;
}

export interface SingleFactorAnnualRow {
  factor: string;
  year: number;
  long_ret: number;
  bench_ret: number;
  excess: number;
}

export interface SingleFactorNavRow {
  date: string;
  factor: string;
  long_nav: number;
  bench_nav: number;
  excess_nav: number;
}

export interface FactorCoverageRow {
  date: string;
  factor: string;
  universe_count: number;
  coverage: number;
  non_missing: number;
  ind_missing: number;
}

export interface GroupCountRow {
  date: string;
  factor: string;
  group: number;
  count: number;
}

export interface SingleFactorGroupRow {
  date: string;
  factor: string;
  group: number;
  ret: number;
  excess: number;
  count: number;
}

export interface CompositeMetricRow {
  combo: string;
  rankic_mean: number;
  rankicir: number;
  long_excess: number;
  groups: number[];
}

export interface CompositeRankicRow {
  date: string;
  rankic: number | null;
  cum: number | null;
  count?: number;
}

export interface CompositeGroupRow {
  date: string;
  group: number;
  ret: number;
  excess: number;
  count: number;
}

export interface CompositeNavRow {
  date: string;
  long_nav: number;
  bench_nav: number;
  excess_nav: number;
}

export interface FactorWeightRow {
  date: string;
  factor: string;
  label: string;
  raw_icir: number;
  floored: number;
  weight: number;
  fallback: boolean;
}

export interface PortfolioNavRow {
  date: string;
  ver: PriceVersion;
  ret: number;
  bench_ret: number;
  nav: number;
  bench_nav: number;
  excess_nav: number;
}

export interface PortfolioAnnualRow {
  year: number;
  ver: PriceVersion;
  ret: number;
  bench_ret: number;
  excess: number;
  mdd: number;
  sharpe: number | null;
}

export interface PortfolioHoldingRow {
  date: string;
  code: string;
  name: string;
  ver: PriceVersion;
  target_w: number;
  actual_w: number;
}

export interface PortfolioTargetRow {
  date: string;
  code: string;
  name: string;
  industry: string;
  score: number;
  rank: number;
  weight: number;
}

export interface PortfolioTurnoverRow {
  date: string;
  ver: PriceVersion;
  buy: number;
  sell: number;
  total: number;
  fee: number;
}

export interface PortfolioCapacityRow {
  date: string;
  ver: PriceVersion;
  capacity: number;
  pos_count: number;
}

export interface PortfolioIndustryAverageRow {
  ver: PriceVersion;
  industry: string;
  avg_w: number;
}

export interface PortfolioIndustryWeightRow {
  date: string;
  industry: string;
  ver: PriceVersion;
  weight: number;
}
