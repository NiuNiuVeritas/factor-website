import { startTransition, useDeferredValue, useMemo, useState } from 'react';
import { Card, Col, Input, Row, Select, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';
import { useData } from '../hooks/useData';
import type {
  PortfolioHoldingRow,
  PortfolioIndustryAverageRow,
  PortfolioIndustryWeightRow,
  PortfolioTargetRow,
  PriceVersion,
  RangePreset,
} from '../types';
import { ACCENT, GREEN, PRIMARY, RED } from '../utils/colors';
import {
  aggregateIndustryWeights,
  filterByRange,
  industryLabel,
  lastDateOf,
} from '../utils/dashboard';
import { factorScore, fullDate, pct, shortDate } from '../utils/format';

interface HoldingsPageProps {
  version: PriceVersion;
  rangePreset: RangePreset;
}

interface HoldingViewRow {
  key: string;
  code: string;
  name: string;
  industry: string;
  rank: number;
  score: number;
  targetWeight: number;
  actualWeight: number;
  deviation: number;
}

export function HoldingsPage({ version, rangePreset }: HoldingsPageProps) {
  const { data: holdingsData, loading: loadingHoldings } =
    useData<PortfolioHoldingRow[]>('portfolio_holdings');
  const { data: targetData, loading: loadingTargets } =
    useData<PortfolioTargetRow[]>('portfolio_targets');
  const { data: industryAvgData, loading: loadingIndustryAvg } =
    useData<PortfolioIndustryAverageRow[]>('portfolio_industry_avg');
  const { data: industryWeightData, loading: loadingIndustryWeight } =
    useData<PortfolioIndustryWeightRow[]>('portfolio_industry_weight');

  const loading = loadingHoldings || loadingTargets || loadingIndustryAvg || loadingIndustryWeight;

  const [selectedDate, setSelectedDate] = useState('');
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');

  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const availableDates = useMemo(() => {
    if (!holdingsData) return [];
    const versionRows = holdingsData.filter((row) => row.ver === version);
    const filteredRows = filterByRange(versionRows, rangePreset, lastDateOf(versionRows));
    return [...new Set(filteredRows.map((row) => row.date))].sort();
  }, [holdingsData, rangePreset, version]);

  const activeDate =
    (selectedDate && availableDates.includes(selectedDate) ? selectedDate : '') ||
    availableDates[availableDates.length - 1] ||
    '';

  const currentRows = useMemo<HoldingViewRow[]>(() => {
    if (!holdingsData || !targetData || !activeDate) return [];
    const actualRows = holdingsData.filter(
      (row) => row.ver === version && row.date === activeDate,
    );
    const actualMap = new Map(actualRows.map((row) => [row.code, row]));
    const targetRows = targetData
      .filter((row) => row.date === activeDate)
      .sort((a, b) => a.rank - b.rank);

    return targetRows.map((row) => {
      const actual = actualMap.get(row.code);
      return {
        key: row.code,
        code: row.code,
        name: row.name,
        industry: industryLabel(row.industry),
        rank: row.rank,
        score: row.score,
        targetWeight: row.weight,
        actualWeight: actual?.actual_w ?? 0,
        deviation: (actual?.actual_w ?? 0) - row.weight,
      };
    });
  }, [activeDate, holdingsData, targetData, version]);

  const filteredRows = useMemo(() => {
    return currentRows.filter((row) => {
      const matchesSearch =
        !deferredSearch ||
        row.code.toLowerCase().includes(deferredSearch) ||
        row.name.toLowerCase().includes(deferredSearch);
      const matchesIndustry = !industryFilter || row.industry === industryFilter;
      return matchesSearch && matchesIndustry;
    });
  }, [currentRows, deferredSearch, industryFilter]);

  const currentIndustryRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of currentRows) {
      map.set(row.industry, (map.get(row.industry) ?? 0) + row.actualWeight);
    }
    return [...map.entries()]
      .map(([industry, weight]) => ({ industry, weight }))
      .sort((a, b) => b.weight - a.weight);
  }, [currentRows]);

  const averageIndustryRows = useMemo(() => {
    if (!industryAvgData) return [];
    return industryAvgData
      .filter((row) => row.ver === version)
      .map((row) => ({ industry: industryLabel(row.industry), weight: row.avg_w }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 12);
  }, [industryAvgData, version]);

  const historyIndustryRows = useMemo(() => {
    if (!industryWeightData) return [];
    const aggregated = aggregateIndustryWeights(industryWeightData).filter(
      (row) => row.ver === version,
    );
    return filterByRange(aggregated, rangePreset, lastDateOf(aggregated));
  }, [industryWeightData, rangePreset, version]);

  const stats = useMemo(() => {
    if (!currentRows.length) return null;
    return {
      stockCount: currentRows.length,
      actualWeight: currentRows.reduce((sum, row) => sum + row.actualWeight, 0),
      targetWeight: currentRows.reduce((sum, row) => sum + row.targetWeight, 0),
      industries: currentIndustryRows.length,
    };
  }, [currentIndustryRows.length, currentRows]);

  const currentIndustryOption = useMemo(() => {
    if (!currentIndustryRows.length) return {};
    const rows = currentIndustryRows.slice(0, 12);
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
      grid: { left: 96, right: 18, top: 20, bottom: 16 },
      series: [
        {
          type: 'bar',
          data: rows.map((row) => row.weight),
          itemStyle: { color: PRIMARY, borderRadius: [0, 6, 6, 0] },
        },
      ],
    };
  }, [currentIndustryRows]);

  const averageIndustryOption = useMemo(() => {
    if (!averageIndustryRows.length) return {};
    return {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'value',
        axisLabel: { formatter: (value: number) => pct(value) },
      },
      yAxis: {
        type: 'category',
        data: averageIndustryRows.map((row) => row.industry),
        inverse: true,
      },
      grid: { left: 96, right: 18, top: 20, bottom: 16 },
      series: [
        {
          type: 'bar',
          data: averageIndustryRows.map((row) => row.weight),
          itemStyle: { color: ACCENT, borderRadius: [0, 6, 6, 0] },
        },
      ],
    };
  }, [averageIndustryRows]);

  const deviationOption = useMemo(() => {
    if (!currentRows.length) return {};
    const rows = [...currentRows]
      .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
      .slice(0, 12);
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: -2, left: 'center', data: ['目标权重', '实际权重'] },
      xAxis: {
        type: 'value',
        axisLabel: { formatter: (value: number) => pct(value) },
      },
      yAxis: {
        type: 'category',
        data: rows.map((row) => row.code),
        inverse: true,
      },
      grid: { left: 76, right: 18, top: 30, bottom: 16 },
      series: [
        {
          name: '目标权重',
          type: 'bar',
          data: rows.map((row) => row.targetWeight),
          itemStyle: { color: 'rgba(42,111,151,0.45)', borderRadius: [0, 6, 6, 0] },
        },
        {
          name: '实际权重',
          type: 'bar',
          data: rows.map((row) => row.actualWeight),
          itemStyle: { color: PRIMARY, borderRadius: [0, 6, 6, 0] },
        },
      ],
    };
  }, [currentRows]);

  const historyHeatmapOption = useMemo(() => {
    if (!historyIndustryRows.length) return {};
    const dates = [...new Set(historyIndustryRows.map((row) => row.date))].sort();
    const industries = [...new Set(historyIndustryRows.map((row) => row.industry))].sort();
    const weights = historyIndustryRows.map((row) => row.weight);
    return {
      tooltip: {
        position: 'top',
        formatter: (params: { value: [number, number, number] }) => {
          const [dateIndex, industryIndex, weight] = params.value;
          return `${fullDate(dates[dateIndex])}<br/>${industries[industryIndex]}: ${pct(weight)}`;
        },
      },
      grid: { left: 110, right: 22, top: 56, bottom: 20 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { formatter: (value: string) => shortDate(value) },
      },
      yAxis: {
        type: 'category',
        data: industries,
      },
      visualMap: {
        min: Math.min(...weights),
        max: Math.max(...weights),
        orient: 'horizontal',
        left: 'center',
        top: 0,
        inRange: {
          color: ['#f3f7fb', '#8bb5d1', '#0f2742'],
        },
      },
      series: [
        {
          type: 'heatmap',
          data: historyIndustryRows.map((row) => [
            dates.indexOf(row.date),
            industries.indexOf(row.industry),
            row.weight,
          ]),
        },
      ],
    };
  }, [historyIndustryRows]);

  const columns = useMemo<ColumnsType<HoldingViewRow>>(
    () => [
      { title: '排名', dataIndex: 'rank', width: 72, sorter: (a, b) => a.rank - b.rank },
      { title: '股票代码', dataIndex: 'code', width: 118 },
      { title: '股票名称', dataIndex: 'name', ellipsis: true },
      {
        title: '行业',
        dataIndex: 'industry',
        width: 132,
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
      {
        title: '权重偏离',
        dataIndex: 'deviation',
        width: 96,
        render: (value: number) => (
          <span style={{ color: value >= 0 ? GREEN : RED }}>{pct(value)}</span>
        ),
      },
    ],
    [],
  );

  const chartEvents = useMemo(
    () => ({
      click: (params: { name: string }) => {
        startTransition(() => setIndustryFilter(params.name));
      },
    }),
    [],
  );

  const heatmapEvents = useMemo(
    () => ({
      click: (params: { value: [number, number, number] }) => {
        const dates = [...new Set(historyIndustryRows.map((row) => row.date))].sort();
        const industries = [...new Set(historyIndustryRows.map((row) => row.industry))].sort();
        const [dateIndex, industryIndex] = params.value;
        startTransition(() => {
          setSelectedDate(dates[dateIndex] ?? activeDate);
          setIndustryFilter(industries[industryIndex] ?? '');
        });
      },
    }),
    [activeDate, historyIndustryRows],
  );

  if (loading) {
    return <Spin size="large" className="page-loading" />;
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">持仓结构</div>
        <h2>组合构成与行业分布</h2>
        <p>
          以调仓日期为主线查看股票清单、目标与实际权重差异，以及行业分布在时间维度上的变化。
        </p>
      </section>

      <div className="toolbar-row toolbar-row-spread">
        <div className="toolbar-inline">
          <div className="toolbar-label">调仓日期</div>
          <Select
            value={activeDate || undefined}
            options={availableDates.map((date) => ({ value: date, label: date }))}
            onChange={(value) => startTransition(() => setSelectedDate(value))}
            className="inline-select date-select"
          />
        </div>
        <div className="toolbar-inline">
          <Input.Search
            allowClear
            className="search-input"
            placeholder="搜索股票代码或名称"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            allowClear
            value={industryFilter || undefined}
            placeholder="筛选行业"
            options={currentIndustryRows.map((row) => ({
              value: row.industry,
              label: row.industry,
            }))}
            onChange={(value) => startTransition(() => setIndustryFilter(value ?? ''))}
            className="inline-select"
          />
        </div>
      </div>

      <div className="metric-grid">
        <Card className="metric-card">
          <div className="metric-label">持仓股票数</div>
          <div className="metric-value">{stats?.stockCount ?? 0}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">实际权重合计</div>
          <div className="metric-value">{pct(stats?.actualWeight)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">目标权重合计</div>
          <div className="metric-value">{pct(stats?.targetWeight)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">行业数</div>
          <div className="metric-value">{stats?.industries ?? 0}</div>
        </Card>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={8}>
          <Card
            className="panel-card"
            title="当前行业分布"
            extra={<span className="card-extra">点击条形可筛选</span>}
          >
            <ReactECharts
              option={currentIndustryOption}
              style={{ height: 340 }}
              onEvents={chartEvents}
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="panel-card" title="平均行业分布">
            <ReactECharts
              option={averageIndustryOption}
              style={{ height: 340 }}
              onEvents={chartEvents}
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card className="panel-card" title="目标与实际权重差异">
            <ReactECharts option={deviationOption} style={{ height: 340 }} />
          </Card>
        </Col>
      </Row>

      <Card
        className="panel-card"
        title="行业分布热力图"
        extra={<span className="card-extra">点击热力块可联动日期与行业筛选</span>}
      >
        <ReactECharts
          option={historyHeatmapOption}
          style={{ height: 420 }}
          onEvents={heatmapEvents}
        />
      </Card>

      <Card
        className="panel-card"
        title="持仓明细"
        extra={<span className="card-extra">{fullDate(activeDate)}</span>}
      >
        <Table
          columns={columns}
          dataSource={filteredRows}
          rowKey="key"
          size="small"
          pagination={{ pageSize: 15 }}
          scroll={{ x: 960 }}
        />
      </Card>
    </div>
  );
}
