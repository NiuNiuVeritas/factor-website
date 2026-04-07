import { useMemo, useState } from 'react';
import { Card, Col, Row, Select, Spin, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';
import { useData } from '../hooks/useData';
import type {
  FactorCoverageRow,
  GroupCountRow,
  RangePreset,
  SingleFactorAnnualRow,
  SingleFactorGroupRow,
  SingleFactorMetricRow,
  SingleFactorRankicRow,
} from '../types';
import { ACCENT, FACTOR_COLORS, GREEN, RED } from '../utils/colors';
import { factorLabel, filterByRange, lastDateOf } from '../utils/dashboard';
import { fullDate, num, pct, shortDate } from '../utils/format';

interface FactorInsightsPageProps {
  rangePreset: RangePreset;
}

export function FactorInsightsPage({ rangePreset }: FactorInsightsPageProps) {
  const { data: metrics, loading: loadingMetrics } =
    useData<SingleFactorMetricRow[]>('single_factor_metrics');
  const { data: rankicData, loading: loadingRankic } =
    useData<SingleFactorRankicRow[]>('single_factor_rankic');
  const { data: annualData, loading: loadingAnnual } =
    useData<SingleFactorAnnualRow[]>('single_factor_annual');
  const { data: coverageData, loading: loadingCoverage } =
    useData<FactorCoverageRow[]>('factor_coverage');
  const { data: groupCounts, loading: loadingCounts } =
    useData<GroupCountRow[]>('group_counts');
  const { data: groupReturns, loading: loadingGroups } =
    useData<SingleFactorGroupRow[]>('single_factor_groups');

  const loading =
    loadingMetrics ||
    loadingRankic ||
    loadingAnnual ||
    loadingCoverage ||
    loadingCounts ||
    loadingGroups;

  const [selectedFactor, setSelectedFactor] = useState('EPQ');

  const factorOptions = useMemo(() => {
    if (!metrics) return [];
    return metrics.map((row) => ({ value: row.factor, label: factorLabel(row.factor) }));
  }, [metrics]);

  const activeFactor =
    factorOptions.find((item) => item.value === selectedFactor)?.value ??
    factorOptions[0]?.value ??
    'EPQ';

  const metricMap = useMemo(() => {
    const map = new Map<string, SingleFactorMetricRow>();
    for (const row of metrics ?? []) {
      map.set(row.factor, row);
    }
    return map;
  }, [metrics]);

  const filteredRankic = useMemo(() => {
    if (!rankicData) return [];
    return filterByRange(rankicData, rangePreset, lastDateOf(rankicData));
  }, [rangePreset, rankicData]);

  const filteredAnnual = useMemo(() => {
    if (!annualData || !filteredRankic.length) return [];
    const startYear = Number(filteredRankic[0].date.slice(0, 4));
    return annualData.filter((row) => row.year >= startYear);
  }, [annualData, filteredRankic]);

  const filteredCoverage = useMemo(() => {
    if (!coverageData) return [];
    return filterByRange(coverageData, rangePreset, lastDateOf(coverageData));
  }, [coverageData, rangePreset]);

  const filteredGroupCounts = useMemo(() => {
    if (!groupCounts) return [];
    const activeRows = groupCounts.filter((row) => row.factor === activeFactor);
    return filterByRange(activeRows, rangePreset, lastDateOf(activeRows));
  }, [activeFactor, groupCounts, rangePreset]);

  const filteredGroupReturns = useMemo(() => {
    if (!groupReturns) return [];
    const activeRows = groupReturns.filter((row) => row.factor === activeFactor);
    return filterByRange(activeRows, rangePreset, lastDateOf(activeRows));
  }, [activeFactor, groupReturns, rangePreset]);

  const activeMetric = metricMap.get(activeFactor);

  const groupBarOption = useMemo(() => {
    if (!filteredGroupReturns.length) return {};
    const groups = Array.from({ length: 10 }, (_, index) => index + 1);
    const averageExcess = groups.map((group) => {
      const rows = filteredGroupReturns.filter((item) => item.group === group);
      return rows.length
        ? rows.reduce((sum, row) => sum + row.excess, 0) / rows.length
        : 0;
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
      grid: { left: 44, right: 20, top: 30, bottom: 28 },
      series: [
        {
          type: 'bar',
          data: averageExcess,
          itemStyle: {
            color: (params: { value: number }) => (params.value >= 0 ? GREEN : RED),
            borderRadius: [6, 6, 0, 0],
          },
        },
      ],
    };
  }, [filteredGroupReturns]);

  const rankicOption = useMemo(() => {
    if (!filteredRankic.length) return {};
    const dates = [...new Set(filteredRankic.map((row) => row.date))].sort();
    const factors = [...new Set(filteredRankic.map((row) => row.factor))];
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
        axisLabel: { formatter: (value: number) => pct(value) },
        splitLine: { lineStyle: { color: '#edf2f7' } },
      },
      grid: { left: 52, right: 24, top: 44, bottom: 28 },
      series: factors.map((factor) => ({
        name: factorLabel(factor),
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: factor === activeFactor ? 3 : 2,
          color: FACTOR_COLORS[factor] ?? ACCENT,
        },
        data: dates.map((date) => {
          const row = filteredRankic.find((item) => item.factor === factor && item.date === date);
          return row?.rankic ?? null;
        }),
      })),
    };
  }, [activeFactor, filteredRankic]);

  const coverageOption = useMemo(() => {
    if (!filteredCoverage.length) return {};
    const factors = ['BP', 'Size'];
    const dates = [...new Set(filteredCoverage.map((row) => row.date))].sort();
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 8, left: 'center', data: factors.map((factor) => factorLabel(factor)) },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { formatter: (value: string) => shortDate(value) },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: (value: number) => pct(value) },
      },
      grid: { left: 44, right: 20, top: 64, bottom: 28 },
      series: factors.map((factor) => ({
        name: factorLabel(factor),
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { color: FACTOR_COLORS[factor] ?? ACCENT },
        data: dates.map((date) => {
          const row = filteredCoverage.find((item) => item.factor === factor && item.date === date);
          return row?.coverage ?? null;
        }),
      })),
    };
  }, [filteredCoverage]);

  const countHeatmapOption = useMemo(() => {
    if (!filteredGroupCounts.length) return {};
    const dates = [...new Set(filteredGroupCounts.map((row) => row.date))].sort();
    const groups = [...new Set(filteredGroupCounts.map((row) => row.group))].sort((a, b) => a - b);
    return {
      tooltip: {
        position: 'top',
        formatter: (params: { value: [number, number, number] }) => {
          const [dateIndex, groupIndex, count] = params.value;
          return `${fullDate(dates[dateIndex])}<br/>第 ${groups[groupIndex]} 组: ${count}`;
        },
      },
      grid: { left: 70, right: 20, top: 56, bottom: 20 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { formatter: (value: string) => shortDate(value) },
      },
      yAxis: {
        type: 'category',
        data: groups.map((group) => `第 ${group} 组`),
      },
      visualMap: {
        min: Math.min(...filteredGroupCounts.map((row) => row.count)),
        max: Math.max(...filteredGroupCounts.map((row) => row.count)),
        orient: 'horizontal',
        left: 'center',
        top: 0,
        inRange: {
          color: ['#edf4ff', '#7fb3d5', '#0f5a8a'],
        },
      },
      series: [
        {
          type: 'heatmap',
          data: filteredGroupCounts.map((row) => [
            dates.indexOf(row.date),
            groups.indexOf(row.group),
            row.count,
          ]),
          label: { show: false },
        },
      ],
    };
  }, [filteredGroupCounts]);

  const annualColumns = useMemo(() => {
    const years = [...new Set(filteredAnnual.map((row) => row.year))].sort((a, b) => a - b);
    const columns: ColumnsType<Record<string, number | string>> = [
      {
        title: '因子',
        dataIndex: 'factor',
        key: 'factor',
        fixed: 'left',
        width: 140,
      },
    ];
    for (const year of years) {
      columns.push({
        title: `${year}`,
        dataIndex: `${year}`,
        key: `${year}`,
        width: 92,
        render: (value: number) => {
          const background =
            value >= 0 ? 'rgba(47,158,120,0.14)' : 'rgba(209,102,102,0.14)';
          const color = value >= 0 ? GREEN : RED;
          return (
            <div
              style={{
                background,
                color,
                borderRadius: 8,
                padding: '4px 8px',
                textAlign: 'center',
              }}
            >
              {pct(value)}
            </div>
          );
        },
      });
    }
    return columns;
  }, [filteredAnnual]);

  const annualRows = useMemo(() => {
    const factors = [...new Set(filteredAnnual.map((row) => row.factor))];
    const years = [...new Set(filteredAnnual.map((row) => row.year))];
    return factors.map((factor) => {
      const row: Record<string, number | string> = {
        key: factor,
        factor: factorLabel(factor),
      };
      for (const year of years) {
        row[`${year}`] =
          filteredAnnual.find((item) => item.factor === factor && item.year === year)?.excess ?? 0;
      }
      return row;
    });
  }, [filteredAnnual]);

  const summaryColumns = useMemo<ColumnsType<SingleFactorMetricRow>>(
    () => [
      {
        title: '因子',
        dataIndex: 'factor',
        key: 'factor',
        render: (value: string) => factorLabel(value),
      },
      {
        title: 'RankIC 均值',
        dataIndex: 'rankic_mean',
        render: (value: number) => pct(value),
      },
      {
        title: '月度胜率',
        dataIndex: 'rankic_win_rate',
        render: (value: number) => pct(value),
      },
      {
        title: '年化 RankICIR',
        dataIndex: 'annualized_rankicir',
        render: (value: number) => num(value),
      },
      {
        title: '多头年化超额',
        dataIndex: 'long_excess',
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
      <section className="page-heading">
        <div className="eyebrow">单因子</div>
        <h2>排序能力、覆盖率与分组表现</h2>
        <p>
          先看因子在选样池中的稳定性，再看 RankIC、十组分层收益和年度超额，用一页快速判断因子质量。
        </p>
      </section>

      <div className="toolbar-row toolbar-row-spread">
        <div className="toolbar-inline">
          <div className="toolbar-label">当前聚焦因子</div>
          <Select
            value={activeFactor}
            options={factorOptions}
            onChange={setSelectedFactor}
            className="inline-select"
          />
        </div>
      </div>

      <div className="metric-grid">
        <Card className="metric-card">
          <div className="metric-label">RankIC 均值</div>
          <div className="metric-value">{pct(activeMetric?.rankic_mean)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">月度胜率</div>
          <div className="metric-value">{pct(activeMetric?.rankic_win_rate)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">年化 RankICIR</div>
          <div className="metric-value">{num(activeMetric?.annualized_rankicir)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">多头年化超额</div>
          <div className="metric-value">{pct(activeMetric?.long_excess)}</div>
        </Card>
      </div>

      <Card className="panel-card" title="单因子整体概览">
        <Table
          columns={summaryColumns}
          dataSource={metrics ?? []}
          rowKey="factor"
          size="small"
          pagination={false}
        />
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={14}>
          <Card className="panel-card" title="各因子 RankIC 时序">
            <ReactECharts option={rankicOption} style={{ height: 360 }} />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card
            className="panel-card"
            title={`${factorLabel(activeFactor)} 十组月均超额`}
            extra={<span className="card-extra">以选样池等权为基准</span>}
          >
            <ReactECharts option={groupBarOption} style={{ height: 360 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
          <Card className="panel-card" title="BP / 市值覆盖率">
            <ReactECharts option={coverageOption} style={{ height: 340 }} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card
            className="panel-card"
            title={`${factorLabel(activeFactor)} 分组样本数`}
            extra={<span className="card-extra">热力图</span>}
          >
            <ReactECharts option={countHeatmapOption} style={{ height: 340 }} />
          </Card>
        </Col>
      </Row>

      <Card className="panel-card" title="年度超额表现">
        <Table
          columns={annualColumns}
          dataSource={annualRows}
          rowKey="key"
          size="small"
          scroll={{ x: 900 }}
          pagination={false}
        />
      </Card>
    </div>
  );
}
