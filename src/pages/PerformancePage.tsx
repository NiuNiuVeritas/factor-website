import { useMemo } from 'react';
import { Card, Col, Row, Spin, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';
import { useData } from '../hooks/useData';
import type {
  PortfolioAnnualRow,
  PortfolioCapacityRow,
  PortfolioNavRow,
  PortfolioTurnoverRow,
  PriceVersion,
  RangePreset,
} from '../types';
import { ACCENT, GREEN, PRIMARY, RED } from '../utils/colors';
import {
  average,
  calcAnnualizedReturn,
  calcMaxDrawdown,
  calcSharpe,
  filterByRange,
  filterByVersion,
  lastDateOf,
} from '../utils/dashboard';
import { amount, num, pct, shortDate } from '../utils/format';

interface PerformancePageProps {
  version: PriceVersion;
  rangePreset: RangePreset;
}

function buildDrawdowns(values: number[]) {
  let peak = values[0] ?? 1;
  return values.map((value) => {
    peak = Math.max(peak, value);
    return value / peak - 1;
  });
}

export function PerformancePage({ version, rangePreset }: PerformancePageProps) {
  const { data: navData, loading: loadingNav } = useData<PortfolioNavRow[]>('portfolio_nav');
  const { data: annualData, loading: loadingAnnual } =
    useData<PortfolioAnnualRow[]>('portfolio_annual');
  const { data: turnoverData, loading: loadingTurnover } =
    useData<PortfolioTurnoverRow[]>('portfolio_turnover');
  const { data: capacityData, loading: loadingCapacity } =
    useData<PortfolioCapacityRow[]>('portfolio_capacity');

  const loading = loadingNav || loadingAnnual || loadingTurnover || loadingCapacity;

  const navRows = useMemo(() => {
    if (!navData) return [];
    const versionRows = filterByVersion(navData, version);
    return filterByRange(versionRows, rangePreset, lastDateOf(versionRows));
  }, [navData, rangePreset, version]);

  const annualRows = useMemo(() => {
    if (!annualData || !navRows.length) return [];
    const startYear = Number(navRows[0].date.slice(0, 4));
    return annualData
      .filter((row) => row.ver === version && row.year >= startYear)
      .sort((a, b) => a.year - b.year);
  }, [annualData, navRows, version]);

  const turnoverRows = useMemo(() => {
    if (!turnoverData) return [];
    const versionRows = filterByVersion(turnoverData, version);
    return filterByRange(versionRows, rangePreset, lastDateOf(versionRows));
  }, [rangePreset, turnoverData, version]);

  const capacityRows = useMemo(() => {
    if (!capacityData) return [];
    const versionRows = filterByVersion(capacityData, version);
    return filterByRange(versionRows, rangePreset, lastDateOf(versionRows));
  }, [capacityData, rangePreset, version]);

  const stats = useMemo(() => {
    if (!navRows.length) return null;
    const first = navRows[0];
    const last = navRows[navRows.length - 1];
    const months = Math.max(navRows.length - 1, 1);
    return {
      cumulative: last.nav / first.nav - 1,
      annualized: calcAnnualizedReturn(first.nav, last.nav, months),
      excess: last.excess_nav / first.excess_nav - 1,
      drawdown: calcMaxDrawdown(navRows.map((row) => row.nav)),
      sharpe: calcSharpe(navRows.map((row) => row.ret)),
      avgTurnover: average(turnoverRows.map((row) => row.total)),
      avgCapacity: average(capacityRows.map((row) => row.capacity)),
    };
  }, [capacityRows, navRows, turnoverRows]);

  const navOption = useMemo(() => {
    if (!navRows.length) return {};
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 8, left: 'center', data: ['组合净值', '基准净值', '超额净值'] },
      xAxis: {
        type: 'category',
        data: navRows.map((row) => row.date),
        axisLabel: { formatter: (value: string) => shortDate(value) },
      },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#edf2f7' } } },
      grid: { left: 52, right: 20, top: 64, bottom: 28 },
      series: [
        {
          name: '组合净值',
          type: 'line',
          data: navRows.map((row) => row.nav),
          smooth: true,
          showSymbol: false,
          lineStyle: { color: PRIMARY, width: 2.5 },
          areaStyle: { color: 'rgba(15,39,66,0.08)' },
        },
        {
          name: '基准净值',
          type: 'line',
          data: navRows.map((row) => row.bench_nav),
          smooth: true,
          showSymbol: false,
          lineStyle: { color: ACCENT, width: 2 },
        },
        {
          name: '超额净值',
          type: 'line',
          data: navRows.map((row) => row.excess_nav),
          smooth: true,
          showSymbol: false,
          lineStyle: { color: GREEN, width: 2 },
        },
      ],
    };
  }, [navRows]);

  const drawdownOption = useMemo(() => {
    if (!navRows.length) return {};
    const values = buildDrawdowns(navRows.map((row) => row.nav));
    return {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: navRows.map((row) => row.date),
        axisLabel: { formatter: (value: string) => shortDate(value) },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: (value: number) => pct(value) },
      },
      grid: { left: 52, right: 20, top: 24, bottom: 28 },
      series: [
        {
          name: '回撤',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: values,
          lineStyle: { color: RED, width: 2 },
          areaStyle: { color: 'rgba(209,102,102,0.14)' },
        },
      ],
    };
  }, [navRows]);

  const annualOption = useMemo(() => {
    if (!annualRows.length) return {};
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 8, left: 'center', data: ['组合收益', '基准收益', '超额收益'] },
      xAxis: { type: 'category', data: annualRows.map((row) => `${row.year}`) },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: (value: number) => pct(value) },
      },
      grid: { left: 52, right: 18, top: 68, bottom: 28 },
      series: [
        {
          name: '组合收益',
          type: 'bar',
          data: annualRows.map((row) => row.ret),
          itemStyle: { color: PRIMARY, borderRadius: [6, 6, 0, 0] },
        },
        {
          name: '基准收益',
          type: 'bar',
          data: annualRows.map((row) => row.bench_ret),
          itemStyle: { color: ACCENT, borderRadius: [6, 6, 0, 0] },
        },
        {
          name: '超额收益',
          type: 'line',
          data: annualRows.map((row) => row.excess),
          smooth: true,
          showSymbol: false,
          lineStyle: { color: GREEN, width: 2.5 },
        },
      ],
    };
  }, [annualRows]);

  const turnoverOption = useMemo(() => {
    if (!turnoverRows.length) return {};
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 8, left: 'center', data: ['总换手率', '交易成本'] },
      xAxis: {
        type: 'category',
        data: turnoverRows.map((row) => row.date),
        axisLabel: { formatter: (value: string) => shortDate(value) },
      },
      yAxis: [
        {
          type: 'value',
          axisLabel: { formatter: (value: number) => pct(value) },
        },
        {
          type: 'value',
          axisLabel: { formatter: (value: number) => pct(value, 3) },
        },
      ],
      grid: { left: 52, right: 52, top: 64, bottom: 28 },
      series: [
        {
          name: '总换手率',
          type: 'bar',
          data: turnoverRows.map((row) => row.total),
          itemStyle: { color: ACCENT, borderRadius: [6, 6, 0, 0] },
        },
        {
          name: '交易成本',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          data: turnoverRows.map((row) => row.fee),
          lineStyle: { color: RED, width: 2 },
        },
      ],
    };
  }, [turnoverRows]);

  const capacityOption = useMemo(() => {
    if (!capacityRows.length) return {};
    return {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: capacityRows.map((row) => row.date),
        axisLabel: { formatter: (value: string) => shortDate(value) },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `${(value / 1e8).toFixed(1)}亿`,
        },
      },
      grid: { left: 52, right: 20, top: 24, bottom: 28 },
      series: [
        {
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: capacityRows.map((row) => row.capacity),
          lineStyle: { color: GREEN, width: 2.5 },
          areaStyle: { color: 'rgba(47,158,120,0.14)' },
        },
      ],
    };
  }, [capacityRows]);

  const annualColumns = useMemo<ColumnsType<PortfolioAnnualRow>>(
    () => [
      { title: '年份', dataIndex: 'year', width: 82 },
      { title: '组合收益', dataIndex: 'ret', render: (value: number) => pct(value) },
      { title: '基准收益', dataIndex: 'bench_ret', render: (value: number) => pct(value) },
      {
        title: '超额收益',
        dataIndex: 'excess',
        render: (value: number) => (
          <span style={{ color: value >= 0 ? GREEN : RED }}>{pct(value)}</span>
        ),
      },
      { title: '最大回撤', dataIndex: 'mdd', render: (value: number) => pct(value) },
      { title: 'Sharpe', dataIndex: 'sharpe', render: (value: number | null) => num(value) },
    ],
    [],
  );

  if (loading) {
    return <Spin size="large" className="page-loading" />;
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">组合表现</div>
        <h2>净值、年度收益、换手与容量</h2>
        <p>
          同步展示收益路径、回撤过程、年度超额、交易活跃度与资金承载水平，形成一套完整的组合运营视角。
        </p>
      </section>

      <div className="metric-grid">
        <Card className="metric-card">
          <div className="metric-label">累计收益</div>
          <div className="metric-value">{pct(stats?.cumulative)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">年化收益</div>
          <div className="metric-value">{pct(stats?.annualized)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">累计超额</div>
          <div className="metric-value">{pct(stats?.excess)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">最大回撤</div>
          <div className="metric-value negative">{pct(stats?.drawdown)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">Sharpe</div>
          <div className="metric-value">{num(stats?.sharpe)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">平均换手率</div>
          <div className="metric-value">{pct(stats?.avgTurnover)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">平均容量</div>
          <div className="metric-value">{amount(stats?.avgCapacity)}</div>
        </Card>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={15}>
          <Card className="panel-card" title="净值走势">
            <ReactECharts option={navOption} style={{ height: 360 }} />
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card className="panel-card" title="回撤曲线">
            <ReactECharts option={drawdownOption} style={{ height: 360 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={14}>
          <Card className="panel-card" title="年度收益对比">
            <ReactECharts option={annualOption} style={{ height: 340 }} />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card className="panel-card" title="换手率与交易成本">
            <ReactECharts option={turnoverOption} style={{ height: 340 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={10}>
          <Card className="panel-card" title="资金容量">
            <ReactECharts option={capacityOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card className="panel-card" title="年度绩效表">
            <Table
              columns={annualColumns}
              dataSource={annualRows}
              rowKey="year"
              size="small"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
