import { useMemo } from 'react';
import { Card, Col, Row, Spin, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';
import { useData } from '../hooks/useData';
import type { RangePreset, UniverseRow } from '../types';
import { ACCENT } from '../utils/colors';
import { filterByRange, lastDateOf } from '../utils/dashboard';
import { integer, shortDate } from '../utils/format';

interface UniversePageProps {
  rangePreset: RangePreset;
}

export function UniversePage({ rangePreset }: UniversePageProps) {
  const { data, loading } = useData<UniverseRow[]>('universe_count');

  const rows = useMemo(() => {
    if (!data) return [];
    return filterByRange(data, rangePreset, lastDateOf(data));
  }, [data, rangePreset]);

  const stats = useMemo(() => {
    if (!rows.length) return null;
    const sizes = rows.map((row) => row.size);
    return {
      min: Math.min(...sizes),
      max: Math.max(...sizes),
      avg: sizes.reduce((sum, value) => sum + value, 0) / sizes.length,
      latest: rows[rows.length - 1].size,
    };
  }, [rows]);

  const option = useMemo(() => {
    if (!rows.length) return {};
    return {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: rows.map((row) => row.date),
        axisLabel: { formatter: (value: string) => shortDate(value) },
      },
      yAxis: {
        type: 'value',
        name: '股票数量',
        splitLine: { lineStyle: { color: '#edf2f7' } },
      },
      grid: { left: 56, right: 24, top: 30, bottom: 32 },
      series: [
        {
          name: '选样池数量',
          type: 'line',
          data: rows.map((row) => row.size),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: ACCENT },
          areaStyle: { color: 'rgba(42,111,151,0.16)' },
        },
      ],
    };
  }, [rows]);

  const columns = useMemo<ColumnsType<UniverseRow>>(
    () => [
      {
        title: '日期',
        dataIndex: 'date',
        width: 140,
        sorter: (a, b) => a.date.localeCompare(b.date),
      },
      {
        title: '股票池数量',
        dataIndex: 'size',
        sorter: (a, b) => a.size - b.size,
        render: (value: number) => integer(value),
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
        <div className="eyebrow">股票池</div>
        <h2>选样池规模与容量基础</h2>
        <p>
          在统一筛选规则下观察样本池规模的长期变化，用于判断策略在不同市场阶段的可投资空间与稳定性。
        </p>
      </section>

      <div className="metric-grid">
        <Card className="metric-card">
          <div className="metric-label">区间最低</div>
          <div className="metric-value">{integer(stats?.min)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">区间最高</div>
          <div className="metric-value">{integer(stats?.max)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">区间均值</div>
          <div className="metric-value">{integer(stats?.avg)}</div>
        </Card>
        <Card className="metric-card">
          <div className="metric-label">最新一期</div>
          <div className="metric-value">{integer(stats?.latest)}</div>
        </Card>
      </div>

      <Row gutter={[20, 20]}>
        <Col span={24}>
          <Card className="panel-card" title="选样池数量趋势">
            <ReactECharts option={option} style={{ height: 420 }} />
          </Card>
        </Col>
        <Col span={24}>
          <Card className="panel-card" title="历史明细">
            <Table
              columns={columns}
              dataSource={rows}
              rowKey="date"
              size="small"
              pagination={{ pageSize: 18 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
