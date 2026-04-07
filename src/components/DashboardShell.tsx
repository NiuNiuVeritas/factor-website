import { useState } from 'react';
import {
  ApartmentOutlined,
  AreaChartOutlined,
  FundProjectionScreenOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  NodeIndexOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, Segmented, Select, Space, Tag, Typography } from 'antd';
import type { MenuProps } from 'antd';
import type { ReactNode } from 'react';
import type { PageKey, PriceVersion, RangePreset, StrategyKey } from '../types';
import {
  RANGE_OPTIONS,
  STRATEGY_OPTIONS,
  VERSION_OPTIONS,
} from '../utils/dashboard';

const { Header, Sider, Content } = Layout;

interface DashboardShellProps {
  activePage: PageKey;
  onPageChange: (key: PageKey) => void;
  strategy: StrategyKey;
  onStrategyChange: (value: StrategyKey) => void;
  version: PriceVersion;
  onVersionChange: (value: PriceVersion) => void;
  rangePreset: RangePreset;
  onRangePresetChange: (value: RangePreset) => void;
  children: ReactNode;
}

const menuItems: MenuProps['items'] = [
  { key: 'overview', icon: <FundProjectionScreenOutlined />, label: '总览' },
  { key: 'universe', icon: <NodeIndexOutlined />, label: '股票池' },
  { key: 'factors', icon: <ApartmentOutlined />, label: '单因子' },
  { key: 'composite', icon: <PieChartOutlined />, label: '复合因子' },
  { key: 'performance', icon: <AreaChartOutlined />, label: '组合表现' },
  { key: 'holdings', icon: <ApartmentOutlined />, label: '持仓结构' },
];

export function DashboardShell({
  activePage,
  onPageChange,
  strategy,
  onStrategyChange,
  version,
  onVersionChange,
  rangePreset,
  onRangePresetChange,
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout className="dashboard-shell">
      <Sider
        breakpoint="lg"
        collapsedWidth={72}
        width={248}
        collapsible
        collapsed={collapsed}
        trigger={null}
        className="dashboard-sider"
        onCollapse={setCollapsed}
      >
        <div className="brand-block">
          <div className="brand-mark">F</div>
          {!collapsed && (
            <div>
              <div className="brand-title">Factor Strategy</div>
              <div className="brand-subtitle">量化选股展示平台</div>
            </div>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activePage]}
          className="side-menu"
          items={menuItems}
          onClick={({ key }) => onPageChange(key as PageKey)}
        />
      </Sider>
      <Layout>
        <Header className="dashboard-header">
          <div className="header-main">
            <Space size={12}>
              <Button
                type="text"
                className="menu-toggle"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed((value) => !value)}
              />
              <div>
                <Typography.Title level={3} className="header-title">
                  中证小盘多因子选股策略
                </Typography.Title>
                <div className="header-meta">
                  <Tag bordered={false}>国证 2000 基准</Tag>
                  <Tag bordered={false}>月度调仓</Tag>
                  <Tag bordered={false}>50 只组合</Tag>
                </div>
              </div>
            </Space>
          </div>
          <div className="toolbar">
            <Select
              value={strategy}
              className="toolbar-select strategy-select"
              options={STRATEGY_OPTIONS as unknown as { value: string; label: string }[]}
              onChange={(value) => onStrategyChange(value as StrategyKey)}
            />
            <Segmented
              value={version}
              options={VERSION_OPTIONS as unknown as { value: string; label: string }[]}
              onChange={(value) => onVersionChange(value as PriceVersion)}
              className="toolbar-segmented"
            />
            <Segmented
              value={rangePreset}
              options={RANGE_OPTIONS as unknown as { value: string; label: string }[]}
              onChange={(value) => onRangePresetChange(value as RangePreset)}
              className="toolbar-segmented range-segmented"
            />
          </div>
        </Header>
        <Content className="dashboard-content">{children}</Content>
      </Layout>
    </Layout>
  );
}
