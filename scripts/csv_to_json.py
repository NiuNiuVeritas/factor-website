"""Convert pipeline CSV outputs to JSON for the web dashboard."""

import csv
import json
import os
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1].parent
OUT = Path(__file__).resolve().parents[1] / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)


def read_csv(path: str) -> list[dict]:
    with open(ROOT / path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def fmt_date(d: str) -> str:
    d = d.strip()[:10]
    return d


def to_float(v: str, decimals: int = 6) -> float | None:
    try:
        return round(float(v), decimals)
    except (ValueError, TypeError):
        return None


def dump(name: str, data):
    with open(OUT / f"{name}.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  -> {name}.json ({len(data) if isinstance(data, list) else 'object'})")


def build_universe_count():
    rows = read_csv("02_universe_builder/version1/outputs/universe_count.csv")
    out = [{"date": fmt_date(r["date"]), "size": int(r["universe_size"])} for r in rows]
    dump("universe_count", out)


def build_single_factor_metrics():
    rows = read_csv("04_single_factor_test/version1/outputs/single_factor_metrics.csv")
    label_map = {"EPQ": "单季度EP", "DividendRatioTTM": "股息率TTM", "BP": "BP", "Size": "市值"}
    out = []
    for r in rows:
        groups = [to_float(r.get(f"group_{i}", ""), 6) for i in range(1, 11)]
        out.append({
            "factor": r["factor_name"],
            "label": label_map.get(r["factor_name"], r["factor_name"]),
            "rankic_mean": to_float(r["rankic_mean"], 4),
            "rankic_win_rate": to_float(r["rankic_win_rate"], 4),
            "annualized_rankicir": to_float(r["annualized_rankicir"], 4),
            "long_excess": to_float(r.get("long_excess_annualized", r.get("full_sample_excess_annualized", "")), 4),
            "groups": groups,
        })
    dump("single_factor_metrics", out)


def build_single_factor_rankic():
    rows = read_csv("04_single_factor_test/version1/outputs/single_factor_rankic_history.csv")
    out = [{"date": fmt_date(r["date"]), "factor": r["factor_name"],
            "rankic": to_float(r["rankic"], 6), "count": int(r["stock_count"])} for r in rows]
    dump("single_factor_rankic", out)


def build_single_factor_annual():
    rows = read_csv("04_single_factor_test/version1/outputs/single_factor_annual_excess.csv")
    out = [{"factor": r["factor_name"], "year": int(r["year"]),
            "long_ret": to_float(r["long_return"], 4),
            "bench_ret": to_float(r["benchmark_return"], 4),
            "excess": to_float(r["excess_return"], 4)} for r in rows]
    dump("single_factor_annual", out)


def build_single_factor_groups():
    rows = read_csv("04_single_factor_test/version1/outputs/single_factor_group_returns.csv")
    out = [{"date": fmt_date(r["date"]), "factor": r["factor_name"],
            "group": int(r["group_id"]), "ret": to_float(r["group_return"], 6),
            "excess": to_float(r["excess_return"], 6),
            "count": int(r["stock_count"])} for r in rows]
    dump("single_factor_groups", out)


def build_single_factor_nav():
    rows = read_csv("04_single_factor_test/version1/outputs/single_factor_nav.csv")
    out = [{"date": fmt_date(r["date"]), "factor": r["factor_name"],
            "long_nav": to_float(r["long_nav"], 4),
            "bench_nav": to_float(r["benchmark_nav"], 4),
            "excess_nav": to_float(r["excess_nav"], 4)} for r in rows]
    dump("single_factor_nav", out)


def build_factor_coverage():
    rows = read_csv("03_factor_preprocess/version1/outputs/factor_coverage_summary.csv")
    out = [{"date": fmt_date(r["date"]), "factor": r["factor_name"],
            "universe_count": int(r["universe_stock_count"]),
            "coverage": to_float(r["raw_coverage_ratio"], 4),
            "non_missing": int(r["raw_non_missing_count"]),
            "ind_missing": int(r["industry_missing_count"])} for r in rows]
    dump("factor_coverage", out)


def build_group_counts():
    rows = read_csv("04_single_factor_test/version1/outputs/single_factor_group_counts.csv")
    out = [{"date": fmt_date(r["date"]), "factor": r["factor_name"],
            "group": int(r["group_id"]), "count": int(r["stock_count"])} for r in rows]
    dump("group_counts", out)


def build_composite_metrics():
    rows = read_csv("05_composite_factor/version1/outputs/composite_metrics.csv")
    out = []
    for r in rows:
        groups = [to_float(r.get(f"group_{i}", ""), 6) for i in range(1, 11)]
        out.append({
            "combo": r["combo_name"],
            "rankic_mean": to_float(r["rankic_mean"], 4),
            "rankicir": to_float(r["annualized_rankicir"], 4),
            "long_excess": to_float(r.get("long_excess_annualized", ""), 4),
            "groups": groups,
        })
    dump("composite_metrics", out)


def build_composite_rankic():
    rows = read_csv("05_composite_factor/version1/outputs/composite_rankic_history.csv")
    out = [{"date": fmt_date(r["date"]), "rankic": to_float(r["rankic"], 6),
            "cum": to_float(r["cum_rankic"], 4), "count": int(r["stock_count"])} for r in rows]
    dump("composite_rankic", out)


def build_composite_groups():
    rows = read_csv("05_composite_factor/version1/outputs/composite_group_returns.csv")
    out = [{"date": fmt_date(r["date"]), "group": int(r["group_id"]),
            "ret": to_float(r["group_return"], 6),
            "excess": to_float(r["excess_return"], 6),
            "count": int(r["stock_count"])} for r in rows]
    dump("composite_groups", out)


def build_composite_nav():
    rows = read_csv("05_composite_factor/version1/outputs/composite_nav.csv")
    out = [{"date": fmt_date(r["date"]),
            "long_nav": to_float(r["long_nav"], 4),
            "bench_nav": to_float(r["benchmark_nav"], 4),
            "excess_nav": to_float(r["excess_nav"], 4)} for r in rows]
    dump("composite_nav", out)


def build_factor_weights():
    rows = read_csv("05_composite_factor/version1/outputs/factor_weights.csv")
    label_map = {"EPQ": "单季度EP", "DividendRatioTTM": "股息率TTM", "BP": "BP", "Size": "市值"}
    out = [{"date": fmt_date(r["date"]), "factor": r["factor_name"],
            "label": label_map.get(r["factor_name"], r["factor_name"]),
            "raw_icir": to_float(r["raw_rankicir"], 4),
            "floored": to_float(r["floored_rankicir"], 4),
            "weight": to_float(r["final_weight"], 4),
            "fallback": r.get("fallback_equal_weight", "").lower() == "true"} for r in rows]
    dump("factor_weights", out)


def build_portfolio_nav():
    rows = read_csv("06_portfolio_backtest/version1/outputs/portfolio_nav.csv")
    out = [{"date": fmt_date(r["date"]), "ver": r["price_version"],
            "ret": to_float(r["portfolio_return"], 6),
            "bench_ret": to_float(r["benchmark_return"], 6),
            "nav": to_float(r["nav"], 4),
            "bench_nav": to_float(r["benchmark_nav"], 4),
            "excess_nav": to_float(r["excess_nav"], 4)} for r in rows]
    dump("portfolio_nav", out)


def build_portfolio_holdings():
    rows = read_csv("06_portfolio_backtest/version1/outputs/portfolio_holdings.csv")
    out = [{"date": fmt_date(r["date"]), "code": r["stock_code"], "name": r["stock_name"],
            "ver": r["price_version"],
            "target_w": to_float(r["target_weight"], 4),
            "actual_w": to_float(r["actual_weight"], 4)} for r in rows]
    dump("portfolio_holdings", out)


def build_portfolio_targets():
    rows = read_csv("06_portfolio_backtest/version1/outputs/portfolio_target_weights.csv")
    out = [{"date": fmt_date(r["date"]), "code": r["stock_code"], "name": r["stock_name"],
            "industry": r.get("citic_l1", ""),
            "score": to_float(r.get("composite_score", ""), 4),
            "rank": int(r.get("rank", 0)),
            "weight": to_float(r["target_weight"], 4)} for r in rows]
    dump("portfolio_targets", out)


def build_portfolio_annual():
    rows = read_csv("06_portfolio_backtest/version1/outputs/portfolio_annual_perf.csv")
    out = [{"year": int(r["year"]), "ver": r["price_version"],
            "ret": to_float(r["return"], 4),
            "bench_ret": to_float(r["benchmark_return"], 4),
            "excess": to_float(r["excess_return"], 4),
            "mdd": to_float(r.get("max_drawdown", ""), 4),
            "sharpe": to_float(r.get("sharpe", ""), 4)} for r in rows]
    dump("portfolio_annual", out)


def build_portfolio_turnover():
    rows = read_csv("06_portfolio_backtest/version1/outputs/portfolio_turnover.csv")
    out = [{"date": fmt_date(r["date"]), "ver": r["price_version"],
            "buy": to_float(r["buy_turnover"], 4),
            "sell": to_float(r["sell_turnover"], 4),
            "total": to_float(r["turnover"], 4),
            "fee": to_float(r["fee_cost"], 6)} for r in rows]
    dump("portfolio_turnover", out)


def build_portfolio_capacity():
    rows = read_csv("06_portfolio_backtest/version1/outputs/portfolio_capacity.csv")
    out = [{"date": fmt_date(r["date"]), "ver": r["price_version"],
            "capacity": to_float(r["capacity"], 2),
            "pos_count": int(r["positive_name_count"])} for r in rows]
    dump("portfolio_capacity", out)


def build_portfolio_industry_avg():
    rows = read_csv("06_portfolio_backtest/version1/outputs/portfolio_industry_average.csv")
    out = [{"ver": r["price_version"], "industry": r["citic_l1"],
            "avg_w": to_float(r["avg_weight"], 4)} for r in rows]
    dump("portfolio_industry_avg", out)


def build_portfolio_industry_weight():
    rows = read_csv("06_portfolio_backtest/version1/outputs/portfolio_industry_weight.csv")
    out = [{"date": fmt_date(r["date"]), "industry": r["citic_l1"],
            "ver": r["price_version"],
            "weight": to_float(r["weight"], 4)} for r in rows]
    dump("portfolio_industry_weight", out)


def build_meta():
    uc = read_csv("02_universe_builder/version1/outputs/universe_count.csv")
    dates = sorted(set(fmt_date(r["date"]) for r in uc))
    meta = {
        "date_range": [dates[0], dates[-1]] if dates else [],
        "n_periods": len(dates),
        "factors": ["EPQ", "DividendRatioTTM", "BP", "Size"],
        "factor_labels": {"EPQ": "单季度EP", "DividendRatioTTM": "股息率TTM", "BP": "BP", "Size": "市值"},
        "benchmark": "国证2000 (399303)",
        "n_stocks": 50,
        "buy_fee": 0.001,
        "sell_fee": 0.002,
        "weight_cap": 0.4,
    }
    dump("meta", meta)


if __name__ == "__main__":
    print("Converting CSV -> JSON ...")
    build_universe_count()
    build_single_factor_metrics()
    build_single_factor_rankic()
    build_single_factor_annual()
    build_single_factor_groups()
    build_single_factor_nav()
    build_factor_coverage()
    build_group_counts()
    build_composite_metrics()
    build_composite_rankic()
    build_composite_groups()
    build_composite_nav()
    build_factor_weights()
    build_portfolio_nav()
    build_portfolio_holdings()
    build_portfolio_targets()
    build_portfolio_annual()
    build_portfolio_turnover()
    build_portfolio_capacity()
    build_portfolio_industry_avg()
    build_portfolio_industry_weight()
    build_meta()
    print("Done!")
