import { useMemo } from 'react';
import { Card, Col, Row, Spin, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';
import { useData } from '../hooks/useData';
import type {
  CompositeGroupRow,
  CompositeNavRow,
  CompositeRankicRow,
  FactorWeightRow,
  RangePreset,
} from '../types';
import { ACCENT, FACTOR_COLORS, GREEN, RED } from '../utils/colors';
import {
  average,
  calcAnnualizedReturn,
  factorLabel,
  filterByRange,
  lastDateOf,
} from '../utils/dashboard';
import { num, pct, shortDate } from '../utils/format';

interface CompositePageProps {
  rangePreset: RangePreset;
}

interface WeightSummaryRow {
  key: string;
  factor: string;
  avgWeight: number;
  latestWeight: number;
  zeroMonths: number;
}

export function CompositePage({ rangePreset }: CompositePageProps) {
  const { data: rankicData, loading: loadingRankic } =
    useData<CompositeRankicRow[]>('composite_rankic');
  const { data: groupData, loading: loadingGroups } =
    useData<CompositeGroupRow[]>('composite_groups');
  const { data: navData, loading: loadingNav } =
    useData<CompositeNavRow[]>('composite_nav');
  const { data: weightData, loading: loadingWeights } =
    useData<FactorWeightRow[]>('factor_weights');

  const loading = loadingRankic || loadingGroups || loadingNav || loadingWeights;

  const filteredRankic = useMemo(() => {
    if (!rankicData) return [];
    return filterByRange(rankicData, rangePreset, lastDateOf(rankicData));
  }, [rangePreset, rankicData]);

  const filteredGroups = useMemo(() => {
    if (!groupData) return [];
    return filterByRange(groupData, rangePreset, lastDateOf(groupData));
  }, [groupData, rangePreset]);

  const filteredNav = useMemo(() => {
    if (!navData) return [];
    return filterByRange(navData, rangePreset, lastDateOf(navData));
  }, [navData, rangePreset]);

  const filteredWeights = useMemo(() => {
    if (!weightData) return [];
    return filterByRange(weightData, rangePreset, lastDateOf(weightData));
  }, [rangePreset, weightData]);

  const stats = useMemo(() => {
    const rankics = filteredRankic
      .map((row) => row.rankic)
      .filter((value): value is number => value != null);
    if (!rankics.length || !filteredNav.length) return null;
    const first = filteredNav[0];
    const last = filteredNav[filteredNav.length - 1];
    const months = Math.max(filteredNav.length - 1, 1);
    const variance = average(rankics.map((value) => (value - average(rankics)) ** 2));
    return {
      rankicMean: average(rankics),
      rankicir: variance > 0 ? (average(rankics) / Math.sqrt(variance)) * Math.sqrt(12) : 0,
      longExcess: calcAnnualizedReturn(first.excess_nav, last.excess_nav, months),
      factorCount: [...new Set(filteredWeights.map((row) => row.factor))].length,
    };
  }, [filteredNav, filteredRankic, filteredWeights]);

  const rankicOption = useMemo(() => {
    if (!filteredRankic.length) return {};
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 8, left: 'center', data: ['月度 RankIC', '累计 RankIC'] },
      xAxis: {
        type: 'category',
        data: filteredRankic.map((row) => row.date),
        axisLabel: { formatter: (value: string) => shortDate(value) },
      },
      yAxis: [
        { type: 'value', name: '月度', splitLine: { lineStyle: { color: '#edf2f7' } } },
        { type: 'value', name: '累计', splitLine: { show: false } },
      ],
      grid: { left: 52, right: 52, top: 68, bottom: 28 },
      series: [
        {
          name: '月度 RankIC',
          type: 'bar',
          data: filteredRankic.map((row) => row.rankic),
          itemStyle: {
            color: (params: { value: number }) => (params.value >= 0 ? GREEN : RED),
          },
        },
        {
          name: '累计 RankIC',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: ACCENT, width: 2.5 },
          data: filteredRankic.map((row) => row.cum),
        },
      ],
    };
  }, [filteredRankic]);

  const groupOption = useMemo(() => {
    if (!filteredGroups.length) return {};
    const groups = Array.from({ length: 10 }, (_, index) => index + 1);
    const values = groups.map((group) => {
      const rows = filteredGroups.filter((row) => row.group === group);
      return rows.length ? average(rows.map((row) => row.excess)) : 0;
    });
    return {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: groups.map((group) => `第 ${group} 组`),
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: (value: number) => pct(value) },
      },
      grid: { left: 44, right: 18, top: 30, bottom: 28 },
      series: [
        {
          type: 'bar',
          data: values,
          itemStyle: {
            color: (params: { value: number }) => (params.value >= 0 ? GREEN : RED),
            borderRadius: [6, 6, 0, 0],
          },
        },
      ],
    };
  }, [filteredGroups]);

  const navOption = useMemo(() => {
    if (!filteredNav.length) return {};
    return {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: filteredNav.map((row) => row.date),
        axisLabel: { formatter: (value: string) => shortDate(value) },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#edf2f7' } },
      },
      grid: { left: 52, right: 18, top: 30, bottom: 28 },
      series: [
        {
          name: '多头相对净值',
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { color: GREEN, width: 2.5 },
          areaStyle: { color: 'rgba(47,158,120,0.12)' },
          data: filteredNav.map((row) => row.excess_nav),
        },
      ],
    };
  }, [filteredNav]);

  const weightAreaOption = useMemo(() => {
    if (!filteredWeights.length) return {};
    const dates = [...new Set(filteredWeights.map((row) => row.date))].sort();
    const factors = [...new Set(filteredWeights.map((row) => row.factor))];
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 8, data: factors.map((factor) => factorLabel(factor)) },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { formatter: (value: string) => shortDate(value) },
      },
      yAxis: {
        type: 'value',
        max: 1,
        axisLabel: { formatter: (value: number) => pct(value) },
      },
      grid: { left: 52, right: 18, top: 44, bottom: 28 },
      series: factors.map((factor) => ({
        name: factorLabel(factor),
        type: 'line',
        stack: 'weights',
        smooth: true,
        showSymbol: false,
        areaStyle: { opacity: 0.18 },
        lineStyle: { color: FACTOR_COLORS[factor] ?? ACCENT },
        data: dates.map((date) => {
          const row = filteredWeights.find((item) => item.factor === factor && item.date === date);
          return row?.weight ?? 0;
        }),
      })),
    };
  }, [filteredWeights]);

  const weightRows = useMemo<WeightSummaryRow[]>(() => {
    if (!filteredWeights.length) return [];
    const factors = [...new Set(filteredWeights.map((row) => row.factor))];
    const latestDate = lastDateOf(filteredWeights);
    return factors.map((factor) => {
      const rows = filteredWeights.filter((row) => row.factor === factor);
      const latestRow = rows.find((row) => row.date === latestDate);
      return {
        key: factor,
        factor: factorLabel(factor),
        avgWeight: average(rows.map((row) => row.weight)),
        latestWeight: latestRow?.weight ?? 0,
        zeroMonths: rows.filter((row) => row.weight === 0).length,
      };
    });
  }, [filteredWeights]);

  const weightColumns = useMemo<ColumnsType<WeightSummaryRow>>(
    () => [
      { title: '因子', dataIndex: 'factor', key: 'factor' },
      {
        title: '平均权重',
        dataIndex: 'avgWeight',
        render: (value: number) => pct(value),
      },
      {
        title: '最新权重',
        dataIndex: 'latestWeight',
        render: (value: number) => pct(value),
      },
      {
        title: '权重归零月数',
        dataIndex: 'zeroMonths',
      },
    ],
    [],
  );

  if (loading) {
    return <Spin size="large" className="page-loading" />;
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">复合因子</div>
        <h2>信号强度与因子权重的联动展示</h2>
        <p>
          在同一页内同步观察复合因子的 RankIC、分组超额、长多净值与权重演化，直观看到信号来源与表现稳定性。
        </p>
      </section>

      <div className="metric-grid">
        <Card className="metric-card">
          <div className="metric-label">RankIC 均值</div>
          <div className="metric-value">{pct(stats?.rankicMean)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">年化 RankICIR</div>
          <div className="metric-value">{num(stats?.rankicir)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">多头年化超额</div>
          <div className="metric-value">{pct(stats?.longExcess)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">参与加权因子数</div>
          <div className="metric-value">{stats?.factorCount ?? 0}</div>
        </Card>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={14}>
          <Card className="panel-card" title="RankIC 与累计 RankIC">
            <ReactECharts option={rankicOption} style={{ height: 360 }} />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card className="panel-card" title="十组月均超额">
            <ReactECharts option={groupOption} style={{ height: 360 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={14}>
          <Card className="panel-card" title="多头相对净值">
            <ReactECharts option={navOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card className="panel-card" title="权重摘要">
            <Table
              columns={weightColumns}
              dataSource={weightRows}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Card className="panel-card" title="因子权重时序">
        <ReactECharts option={weightAreaOption} style={{ height: 360 }} />
      </Card>
    </div>
  );
}
