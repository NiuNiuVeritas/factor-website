import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOutlined,
  FileTextOutlined,
  FundProjectionScreenOutlined,
  HomeOutlined,
  LoginOutlined,
  MenuOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  Button,
  ConfigProvider,
  Drawer,
  Input,
  Menu,
  Spin,
  Table,
  Typography,
  theme as antdTheme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import ReactECharts from 'echarts-for-react';

type PageKey = 'home' | 'team' | 'research' | 'active' | 'index' | 'etf' | 'fof';
type StrategyId = 'earnings-surprise' | 'gold-stock-enhanced';

interface Strategy {
  id: StrategyId;
  displayName: string;
  type: string;
  benchmarkCode: string;
  benchmarkName: string;
  reportName: string;
  reportUrl: string;
  description: string;
  startDate: string;
  endDate: string;
  latestNav: number;
  annualizedReturn: number;
  maxDrawdown: number;
}

interface NavRow {
  strategyId: StrategyId;
  date: string;
  nav: number;
  benchmarkNav: number | null;
  excessNav: number | null;
}

interface AnnualRow {
  strategyId: StrategyId;
  year: number;
  strategyReturn: number | null;
  benchmarkReturn: number | null;
  excessReturn: number | null;
}

interface HoldingRow {
  strategyId: StrategyId;
  date: string;
  code: string;
  name: string;
  industry: string;
  weight: number;
}

interface ReportRow {
  category: string;
  title: string;
  url: string;
}

interface PortalData {
  updatedAt: string;
  teamImage: string;
  strategies: Strategy[];
  nav: NavRow[];
  annual: AnnualRow[];
  holdings: HoldingRow[];
  reports: ReportRow[];
}

const menuItems: MenuProps['items'] = [
  { key: 'home', icon: <HomeOutlined />, label: '首页' },
  { key: 'team', icon: <TeamOutlined />, label: '团队介绍' },
  { key: 'research', icon: <BookOutlined />, label: '研究成果展示' },
  { key: 'active', icon: <FundProjectionScreenOutlined />, label: '主动量化组合' },
  { key: 'index', icon: <FileTextOutlined />, label: '指数增强组合' },
  { key: 'etf', icon: <FileTextOutlined />, label: 'ETF轮动组合' },
  { key: 'fof', icon: <FileTextOutlined />, label: 'FOF组合' },
];

const pageTitles: Record<PageKey, string> = {
  home: '首页',
  team: '团队介绍',
  research: '研究成果展示',
  active: '主动量化组合',
  index: '指数增强组合',
  etf: 'ETF轮动组合',
  fof: 'FOF组合',
};

const pctFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'percent',
});

const navFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

function pct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return pctFormatter.format(value);
}

function nav(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return navFormatter.format(value);
}

function dateLabel(date: string | null | undefined): string {
  return date ? date : '-';
}

function getLatestDate(rows: HoldingRow[]): string {
  return rows.reduce((latest, row) => (row.date > latest ? row.date : latest), '');
}

async function fetchPortalData(): Promise<PortalData> {
  const dataUrl = new URL(`${import.meta.env.BASE_URL}data/portal/portal.json`, window.location.href);
  dataUrl.searchParams.set('t', Date.now().toString());
  const response = await fetch(dataUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('数据读取失败');
  }
  return response.json() as Promise<PortalData>;
}

function App() {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataError, setDataError] = useState('');
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem('portal-auth') === '1');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activePage, setActivePage] = useState<PageKey>('home');
  const [strategyId, setStrategyId] = useState<StrategyId>('earnings-surprise');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setDataError('');
    try {
      const payload = await fetchPortalData();
      setData(payload);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : '数据读取失败');
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedStrategy = useMemo(
    () => data?.strategies.find((strategy) => strategy.id === strategyId) ?? data?.strategies[0],
    [data, strategyId],
  );

  const handleLogin = () => {
    if (!account.trim() || !password.trim()) {
      setLoginError('请输入账号和密码');
      return;
    }
    localStorage.setItem('portal-auth', '1');
    setLoginError('');
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('portal-auth');
    setLoggedIn(false);
    setPassword('');
  };

  const handleMenuClick = (key: PageKey) => {
    setActivePage(key);
    setMobileMenuOpen(false);
  };

  if (!loggedIn) {
    return (
      <Theme>
        <LoginPage
          account={account}
          password={password}
          error={loginError}
          onAccountChange={setAccount}
          onPasswordChange={setPassword}
          onLogin={handleLogin}
        />
      </Theme>
    );
  }

  return (
    <Theme>
      <div className="portal-shell">
        <aside className="portal-sidebar">
          <Brand />
          <PortalMenu activePage={activePage} onMenuClick={handleMenuClick} />
        </aside>
        <div className="portal-workspace">
          <header className="portal-topbar">
            <Button
              className="mobile-menu-button"
              type="text"
              icon={<MenuOutlined />}
              aria-label="打开菜单"
              onClick={() => setMobileMenuOpen(true)}
            />
            <div>
              <div className="topbar-title">量化藏经阁</div>
              <div className="topbar-date">更新至 {data?.updatedAt ?? '-'}</div>
            </div>
            <div className="topbar-actions">
              <Button
                className="plain-action"
                icon={<ReloadOutlined />}
                loading={refreshing}
                aria-label="刷新数据"
                onClick={() => void loadData(true)}
              >
                刷新
              </Button>
              <Button className="plain-action" aria-label="退出登录" onClick={handleLogout}>
                退出
              </Button>
            </div>
          </header>
          <main className="portal-content">
            {dataError ? (
              <div className="state-message">{dataError}</div>
            ) : loading || !data || !selectedStrategy ? (
              <div className="loading-area">
                <Spin />
              </div>
            ) : (
              <PageContent
                activePage={activePage}
                data={data}
                selectedStrategy={selectedStrategy}
                strategyId={strategyId}
                onStrategyChange={setStrategyId}
              />
            )}
          </main>
        </div>
        <Drawer
          title="投研门户"
          placement="left"
          open={mobileMenuOpen}
          size="default"
          onClose={() => setMobileMenuOpen(false)}
        >
          <PortalMenu activePage={activePage} onMenuClick={handleMenuClick} />
        </Drawer>
      </div>
    </Theme>
  );
}

interface LoginPageProps {
  account: string;
  password: string;
  error: string;
  onAccountChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onLogin: () => void;
}

function LoginPage({
  account,
  password,
  error,
  onAccountChange,
  onPasswordChange,
  onLogin,
}: LoginPageProps) {
  return (
    <main className="login-page">
      <section className="login-shell" aria-labelledby="login-title">
        <div className="login-brand-panel">
          <div className="login-mark">藏</div>
          <div>
            <div className="login-brand-name">Guosen Quant</div>
            <div className="login-brand-line">量化藏经阁</div>
          </div>
        </div>
        <form
          className="login-panel"
          onSubmit={(event) => {
            event.preventDefault();
            onLogin();
          }}
        >
          <div className="login-kicker">Private Access</div>
          <Typography.Title id="login-title" level={1}>
            量化藏经阁
          </Typography.Title>
          <Input
            id="portal-account"
            name="account"
            size="large"
            value={account}
            placeholder="账号"
            autoComplete="username"
            onChange={(event) => onAccountChange(event.target.value)}
          />
          <Input.Password
            id="portal-password"
            name="password"
            size="large"
            value={password}
            placeholder="密码"
            autoComplete="current-password"
            onChange={(event) => onPasswordChange(event.target.value)}
          />
          {error && <div className="login-error">{error}</div>}
          <Button size="large" type="primary" htmlType="submit" icon={<LoginOutlined />}>
            登录
          </Button>
        </form>
      </section>
    </main>
  );
}

function Brand() {
  return (
    <div className="portal-brand">
      <div className="brand-emblem">藏</div>
      <div>
        <div className="brand-name">量化藏经阁</div>
        <div className="brand-caption">Quant & FOF</div>
      </div>
    </div>
  );
}

interface PortalMenuProps {
  activePage: PageKey;
  onMenuClick: (key: PageKey) => void;
}

function PortalMenu({ activePage, onMenuClick }: PortalMenuProps) {
  return (
    <Menu
      mode="inline"
      selectedKeys={[activePage]}
      items={menuItems}
      className="portal-menu"
      onClick={({ key }) => onMenuClick(key as PageKey)}
    />
  );
}

interface PageContentProps {
  activePage: PageKey;
  data: PortalData;
  selectedStrategy: Strategy;
  strategyId: StrategyId;
  onStrategyChange: (id: StrategyId) => void;
}

function PageContent({
  activePage,
  data,
  selectedStrategy,
  strategyId,
  onStrategyChange,
}: PageContentProps) {
  if (activePage === 'home') {
    return <HomePage />;
  }
  if (activePage === 'team') {
    return <TeamPage imagePath={data.teamImage} />;
  }
  if (activePage === 'research') {
    return <ResearchPage reports={data.reports} />;
  }
  if (activePage === 'active') {
    return (
      <StrategyPage
        data={data}
        selectedStrategy={selectedStrategy}
        strategyId={strategyId}
        onStrategyChange={onStrategyChange}
      />
    );
  }
  return <QuietPlaceholder title={pageTitles[activePage]} />;
}

function HomePage() {
  return (
    <section className="page-section home-page">
      <Typography.Title level={1}>量化藏经阁</Typography.Title>
      <div className="home-rule" />
      <p>分享量化投资和FOF投资领域的研究成果。</p>
    </section>
  );
}

function TeamPage({ imagePath }: { imagePath: string }) {
  return (
    <section className="page-section">
      <PageTitle title="团队介绍" subtitle="国信金工团队成员简介" />
      <div className="image-sheet">
        <img src={`${import.meta.env.BASE_URL}${imagePath}`} alt="国信金工团队成员简介" />
      </div>
    </section>
  );
}

function ResearchPage({ reports }: { reports: ReportRow[] }) {
  const categories = useMemo(() => [...new Set(reports.map((report) => report.category))], [reports]);
  const [category, setCategory] = useState(categories[0] ?? '');
  const visibleReports = reports.filter((report) => report.category === category);

  const columns: ColumnsType<ReportRow> = [
    {
      title: '报告名称',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '链接',
      key: 'url',
      width: 120,
      render: (_, record) => (
        <a href={record.url} target="_blank" rel="noreferrer">
          查看
        </a>
      ),
    },
  ];

  return (
    <section className="page-section">
      <PageTitle title="研究成果展示" subtitle="年度研究报告精选" />
      <div className="category-strip">
        {categories.map((item) => (
          <button
            key={item}
            className={item === category ? 'category-tab active' : 'category-tab'}
            type="button"
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <Table
        rowKey={(record) => record.url}
        columns={columns}
        dataSource={visibleReports}
        pagination={false}
        className="institution-table"
      />
    </section>
  );
}

interface StrategyPageProps {
  data: PortalData;
  selectedStrategy: Strategy;
  strategyId: StrategyId;
  onStrategyChange: (id: StrategyId) => void;
}

function StrategyPage({ data, selectedStrategy, strategyId, onStrategyChange }: StrategyPageProps) {
  const navRows = useMemo(
    () => data.nav.filter((row) => row.strategyId === selectedStrategy.id),
    [data.nav, selectedStrategy.id],
  );
  const annualRows = useMemo(
    () =>
      data.annual
        .filter((row) => row.strategyId === selectedStrategy.id)
        .sort((a, b) => b.year - a.year),
    [data.annual, selectedStrategy.id],
  );
  const holdings = useMemo(
    () => data.holdings.filter((row) => row.strategyId === selectedStrategy.id),
    [data.holdings, selectedStrategy.id],
  );
  const latestHoldingDate = getLatestDate(holdings);
  const latestHoldings = holdings.filter((row) => row.date === latestHoldingDate);

  const strategyOptions = data.strategies.map((strategy) => ({
    label: strategy.displayName,
    value: strategy.id,
  }));

  return (
    <section className="page-section">
      <PageTitle title="主动量化组合" />
      <div className="strategy-switch" aria-label="策略列表">
        {strategyOptions.map((option) => (
          <button
            key={option.value}
            className={option.value === strategyId ? 'strategy-switch-item active' : 'strategy-switch-item'}
            type="button"
            onClick={() => onStrategyChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="strategy-detail">
        <div className="strategy-heading">
          <div>
            <h2>{selectedStrategy.displayName}</h2>
            <p>{selectedStrategy.description}</p>
          </div>
          <a href={selectedStrategy.reportUrl} target="_blank" rel="noreferrer">
            {selectedStrategy.reportName}
          </a>
        </div>

        <div className="metric-row">
          <Metric label="最新净值" value={nav(selectedStrategy.latestNav)} />
          <Metric label="年化收益" value={pct(selectedStrategy.annualizedReturn)} />
          <Metric label="最大回撤" value={pct(selectedStrategy.maxDrawdown)} />
          <Metric label="基准" value={selectedStrategy.benchmarkName} />
        </div>

        <section className="content-block">
          <BlockTitle title="策略净值" meta={`${dateLabel(selectedStrategy.startDate)} - ${dateLabel(selectedStrategy.endDate)}`} />
          <ReactECharts option={buildNavOption(navRows, selectedStrategy.benchmarkName)} className="nav-chart" />
        </section>

        <section className="content-grid">
          <div className="content-block">
            <BlockTitle title="分年度表现" meta="%" />
            <AnnualTable rows={annualRows} />
          </div>
          <div className="content-block">
            <BlockTitle title="最新持仓" meta={latestHoldingDate} />
            <HoldingsTable rows={latestHoldings} />
          </div>
        </section>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="page-title">
      <Typography.Title level={1}>{title}</Typography.Title>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}

function BlockTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="block-title">
      <Typography.Title level={2}>{title}</Typography.Title>
      {meta && <span>{meta}</span>}
    </div>
  );
}

function AnnualTable({ rows }: { rows: AnnualRow[] }) {
  const columns: ColumnsType<AnnualRow> = [
    { title: '年份', dataIndex: 'year', key: 'year', width: 88 },
    {
      title: '组合',
      dataIndex: 'strategyReturn',
      key: 'strategyReturn',
      align: 'right',
      render: (value: number | null) => pct(value),
    },
    {
      title: '基准',
      dataIndex: 'benchmarkReturn',
      key: 'benchmarkReturn',
      align: 'right',
      render: (value: number | null) => pct(value),
    },
    {
      title: '超额',
      dataIndex: 'excessReturn',
      key: 'excessReturn',
      align: 'right',
      render: (value: number | null) => (
        <span className={value != null && value < 0 ? 'negative' : 'positive'}>{pct(value)}</span>
      ),
    },
  ];

  return (
    <Table
      rowKey={(record) => `${record.strategyId}-${record.year}`}
      columns={columns}
      dataSource={rows}
      pagination={{ pageSize: 8, size: 'small' }}
      size="middle"
      className="institution-table"
    />
  );
}

function HoldingsTable({ rows }: { rows: HoldingRow[] }) {
  const columns: ColumnsType<HoldingRow> = [
    { title: '代码', dataIndex: 'code', key: 'code', width: 112 },
    { title: '名称', dataIndex: 'name', key: 'name', width: 120 },
    { title: '行业', dataIndex: 'industry', key: 'industry' },
    {
      title: '权重',
      dataIndex: 'weight',
      key: 'weight',
      align: 'right',
      width: 110,
      render: (value: number) => pct(value),
    },
  ];

  return (
    <Table
      rowKey={(record) => `${record.strategyId}-${record.date}-${record.code}`}
      columns={columns}
      dataSource={rows}
      pagination={{ pageSize: 8, size: 'small' }}
      size="middle"
      className="institution-table"
      scroll={{ x: 520 }}
    />
  );
}

function QuietPlaceholder({ title }: { title: string }) {
  return (
    <section className="page-section quiet-page">
      <PageTitle title={title} subtitle="资料待更新" />
    </section>
  );
}

function buildNavOption(rows: NavRow[], benchmarkName: string) {
  return {
    color: ['#0f5132', '#8d734a', '#333333'],
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => nav(value),
    },
    legend: {
      top: 0,
      right: 8,
      itemGap: 20,
      data: ['组合净值', benchmarkName, '超额净值'],
    },
    grid: { left: 48, right: 24, top: 48, bottom: 36 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: rows.map((row) => row.date),
      axisLabel: {
        formatter: (value: string) => value.slice(0, 7),
      },
      axisLine: { lineStyle: { color: '#d4d7d1' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#eceee8' } },
    },
    series: [
      {
        name: '组合净值',
        type: 'line',
        data: rows.map((row) => row.nav),
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 2.6 },
      },
      {
        name: benchmarkName,
        type: 'line',
        data: rows.map((row) => row.benchmarkNav),
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 1.8 },
      },
      {
        name: '超额净值',
        type: 'line',
        data: rows.map((row) => row.excessNav),
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 1.8, type: 'dashed' },
      },
    ],
  };
}

function Theme({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          borderRadius: 2,
          colorBgLayout: '#f3f4f3',
          colorPrimary: '#1f5f48',
          colorText: '#171917',
          colorTextSecondary: '#666c65',
          fontFamily:
            '"Aptos", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

export default App;
