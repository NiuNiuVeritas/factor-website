import { useMemo } from 'react';
import { Card, Col, Row, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';
import { useData } from '../hooks/useData';
import type {
  MetaData,
  PortfolioAnnualRow,
  PortfolioCapacityRow,
  PortfolioHoldingRow,
  PortfolioNavRow,
  PortfolioTargetRow,
  PortfolioTurnoverRow,
  PriceVersion,
  RangePreset,
} from '../types';
import { ACCENT, GOLD, GREEN, PRIMARY, RED } from '../utils/colors';
import {
  average,
  calcAnnualizedReturn,
  calcMaxDrawdown,
  calcSharpe,
  filterByRange,
  filterByVersion,
  industryLabel,
  lastDateOf,
} from '../utils/dashboard';
import { amount, factorScore, fullDate, integer, num, pct, shortDate } from '../utils/format';

interface OverviewPageProps {
  version: PriceVersion;
  rangePreset: RangePreset;
}

interface LatestHoldingView {
  key: string;
  code: string;
  name: string;
  industry: string;
  score: number;
  rank: number;
  targetWeight: number;
  actualWeight: number;
}

export function OverviewPage({ version, rangePreset }: OverviewPageProps) {
  const { data: meta, loading: loadingMeta } = useData<MetaData>('meta');
  const { data: navData, loading: loadingNav } = useData<PortfolioNavRow[]>('portfolio_nav');
  const { data: annualData, loading: loadingAnnual } =
    useData<PortfolioAnnualRow[]>('portfolio_annual');
  const { data: turnoverData, loading: loadingTurnover } =
    useData<PortfolioTurnoverRow[]>('portfolio_turnover');
  const { data: capacityData, loading: loadingCapacity } =
    useData<PortfolioCapacityRow[]>('portfolio_capacity');
  const { data: holdingsData, loading: loadingHoldings } =
    useData<PortfolioHoldingRow[]>('portfolio_holdings');
  const { data: targetData, loading: loadingTargets } =
    useData<PortfolioTargetRow[]>('portfolio_targets');

  const loading =
    loadingMeta ||
    loadingNav ||
    loadingAnnual ||
    loadingTurnover ||
    loadingCapacity ||
    loadingHoldings ||
    loadingTargets;

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

  const latestDate = useMemo(() => {
    if (!holdingsData) return '';
    const versionRows = filterByVersion(holdingsData, version);
    const filteredRows = filterByRange(versionRows, rangePreset, lastDateOf(versionRows));
    return lastDateOf(filteredRows);
  }, [holdingsData, rangePreset, version]);

  const latestHoldings = useMemo<LatestHoldingView[]>(() => {
    if (!holdingsData || !targetData || !latestDate) return [];
    const actualMap = new Map(
      holdingsData
        .filter((row) => row.ver === version && row.date === latestDate)
        .map((row) => [row.code, row]),
    );

    return targetData
      .filter((row) => row.date === latestDate)
      .sort((a, b) => a.rank - b.rank)
      .map((row) => {
        const actual = actualMap.get(row.code);
        return {
          key: `${latestDate}-${row.code}`,
          code: row.code,
          name: row.name,
          industry: industryLabel(row.industry),
          score: row.score,
          rank: row.rank,
          targetWeight: row.weight,
          actualWeight: actual?.actual_w ?? 0,
        };
      });
  }, [holdingsData, latestDate, targetData, version]);

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
      turnover: average(turnoverRows.map((row) => row.total)),
      capacity: average(capacityRows.map((row) => row.capacity)),
      winRate: annualRows.length
        ? annualRows.filter((row) => row.excess > 0).length / annualRows.length
        : 0,
      stockCount: latestHoldings.length,
    };
  }, [annualRows, capacityRows, latestHoldings.length, navRows, turnoverRows]);

  const industryRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of latestHoldings) {
      map.set(row.industry, (map.get(row.industry) ?? 0) + row.actualWeight);
    }
    return [...map.entries()]
      .map(([industry, weight]) => ({ industry, weight }))
      .sort((a, b) => b.weight - a.weight);
  }, [latestHoldings]);

  const topIndustryConcentration = useMemo(
    () => industryRows.slice(0, 3).reduce((sum, row) => sum + row.weight, 0),
    [industryRows],
  );

  const navOption = useMemo(() => {
    if (!navRows.length) return {};
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 8, data: ['组合净值', '基准净值', '超额净值'] },
      xAxis: {
        type: 'category',
        data: navRows.map((row) => row.date),
        axisLabel: { formatter: (value: string) => shortDate(value) },
      },
      yAxis: {
        type: 'value',
        name: '净值',
        splitLine: { lineStyle: { color: '#edf2f7' } },
      },
      grid: { left: 56, right: 24, top: 48, bottom: 30 },
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
          lineStyle: { color: GOLD, width: 2, type: 'dashed' },
        },
      ],
    };
  }, [navRows]);

  const annualOption = useMemo(() => {
    if (!annualRows.length) return {};
    return {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: annualRows.map((row) => `${row.year}`),
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: (value: number) => pct(value) },
      },
      grid: { left: 44, right: 20, top: 28, bottom: 28 },
      series: [
        {
          name: '年度超额',
          type: 'bar',
          data: annualRows.map((row) => row.excess),
          itemStyle: {
            color: (params: { value: number }) => (params.value >= 0 ? GREEN : RED),
            borderRadius: [6, 6, 0, 0],
          },
        },
      ],
    };
  }, [annualRows]);

  const industryOption = useMemo(() => {
    if (!industryRows.length) return {};
    const rows = industryRows.slice(0, 10);
    return {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'value',
        axisLabel: { formatter: (value: number) => pct(value) },
      },
      yAxis: {
        type: 'category',
        data: rows.map((row) => row.industry),
        inverse: true,
      },
      grid: { left: 90, right: 20, top: 20, bottom: 20 },
      series: [
        {
          type: 'bar',
          data: rows.map((row) => row.weight),
          itemStyle: { color: ACCENT, borderRadius: [0, 6, 6, 0] },
        },
      ],
    };
  }, [industryRows]);

  const columns = useMemo<ColumnsType<LatestHoldingView>>(
    () => [
      { title: '排名', dataIndex: 'rank', width: 72, sorter: (a, b) => a.rank - b.rank },
      { title: '股票代码', dataIndex: 'code', width: 108 },
      { title: '股票名称', dataIndex: 'name', ellipsis: true },
      {
        title: '行业',
        dataIndex: 'industry',
        width: 128,
        render: (value: string) => <Tag>{value}</Tag>,
      },
      {
        title: '复合得分',
        dataIndex: 'score',
        width: 96,
        render: (value: number) => factorScore(value),
      },
      {
        title: '目标权重',
        dataIndex: 'targetWeight',
        width: 96,
        render: (value: number) => pct(value),
      },
      {
        title: '实际权重',
        dataIndex: 'actualWeight',
        width: 96,
        render: (value: number) => pct(value),
      },
    ],
    [],
  );

  if (loading) {
    return <Spin size="large" className="page-loading" />;
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <div className="eyebrow">策略总览</div>
          <h1 className="hero-title">从因子筛选到组合落地的完整展示</h1>
          <p className="hero-subtitle">
            以沪深股票池为基础，按月构建 50 只等权组合，统一呈现选样池稳定性、因子排序能力、组合收益表现与持仓结构特征。
          </p>
          <div className="mini-metrics">
            <div className="mini-metric">
              <span>回测区间</span>
              <strong>
                {meta?.date_range ? `${meta.date_range[0]} 至 ${meta.date_range[1]}` : '-'}
              </strong>
            </div>
            <div className="mini-metric">
              <span>最新调仓日</span>
              <strong>{fullDate(latestDate)}</strong>
            </div>
            <div className="mini-metric">
              <span>组合股票数</span>
              <strong>{integer(stats?.stockCount)}</strong>
            </div>
          </div>
        </div>
        <div className="hero-tags">
          <Tag color="blue">国证 2000 基准</Tag>
          <Tag color="cyan">月度调仓</Tag>
          <Tag color="gold">等权持仓</Tag>
          <Tag color="green">多因子打分</Tag>
        </div>
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
          <div className="metric-value">{pct(stats?.turnover)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">平均容量</div>
          <div className="metric-value">{amount(stats?.capacity)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">年度胜率</div>
          <div className="metric-value">{pct(stats?.winRate)}</div>
        </Card>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={15}>
          <Card
            className="panel-card"
            title="净值与超额走势"
            extra={<span className="card-extra">基准：国证 2000</span>}
          >
            <ReactECharts option={navOption} style={{ height: 380 }} />
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card
            className="panel-card"
            title="年度超额表现"
            extra={<span className="card-extra">按自然年汇总</span>}
          >
            <ReactECharts option={annualOption} style={{ height: 380 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={9}>
          <Card
            className="panel-card"
            title="当前行业分布"
            extra={<span className="card-extra">前三行业占比 {pct(topIndustryConcentration)}</span>}
          >
            <ReactECharts option={industryOption} style={{ height: 360 }} />
          </Card>
        </Col>
        <Col xs={24} xl={15}>
          <Card
            className="panel-card"
            title="最新一期持仓"
            extra={<span className="card-extra">{fullDate(latestDate)}</span>}
          >
            <Table
              columns={columns}
              dataSource={latestHoldings.slice(0, 12)}
              size="small"
              rowKey="key"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
