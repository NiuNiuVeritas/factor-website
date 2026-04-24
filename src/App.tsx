import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRightOutlined,
  FileTextOutlined,
  FundProjectionScreenOutlined,
  LoginOutlined,
  MenuOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Button,
  ConfigProvider,
  Drawer,
  Dropdown,
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
type RangeKey = 'full' | 5 | 3 | 1;
type PortfolioPageKey = Extract<PageKey, 'active' | 'index' | 'etf' | 'fof'>;
type TopNavKey = 'home' | 'team' | 'research' | 'portfolio';

interface ChartNavRow {
  date: string;
  strategyNav: number;
  benchmarkNav: number | null;
  relativeStrength: number | null;
}

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
  fundBenchmarkNav: number | null;
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

interface TeamMember {
  name: string;
  title: string;
  education: string;
  summary: string;
}

interface AnnualTargetRow {
  year: number;
  strategyReturn: number;
  benchmarkReturn: number;
}

const topNavItems = [
  { key: 'home', label: '首页' },
  { key: 'team', label: '团队介绍' },
  { key: 'research', label: '研究成果展示' },
  { key: 'portfolio', label: '投资组合' },
] as const;

const topNavMenuItems: MenuProps['items'] = topNavItems.map(({ key, label }) => ({ key, label }));
const topNavOrder: TopNavKey[] = topNavItems.map((item) => item.key);

const portfolioOrder: PortfolioPageKey[] = ['active', 'index', 'etf', 'fof'];

const portfolioSideItems: MenuProps['items'] = [
  {
    key: 'active',
    icon: <FundProjectionScreenOutlined />,
    label: '主动量化组合',
    children: [
      { key: 'active:earnings-surprise', label: '超预期精选组合' },
      { key: 'active:gold-stock-enhanced', label: '券商金股增强组合' },
    ],
  },
  {
    key: 'index',
    icon: <FileTextOutlined />,
    label: '指数增强组合',
    children: [{ key: 'index:overview', label: '指数增强主策略' }],
  },
  {
    key: 'etf',
    icon: <FileTextOutlined />,
    label: 'ETF轮动组合',
    children: [{ key: 'etf:overview', label: 'ETF轮动主策略' }],
  },
  {
    key: 'fof',
    icon: <FileTextOutlined />,
    label: 'FOF组合',
    children: [{ key: 'fof:overview', label: 'FOF主策略' }],
  },
];

const portfolioKeys = new Set<PageKey>(portfolioOrder);

const DISPLAY_BENCHMARK_NAME = '偏股混合型基金指数';

const STRATEGY_DISPLAY_TARGETS: Record<StrategyId, AnnualTargetRow[]> = {
  'earnings-surprise': [
    { year: 2010, strategyReturn: 0.5507, benchmarkReturn: 0.0531 },
    { year: 2011, strategyReturn: -0.0923, benchmarkReturn: -0.227 },
    { year: 2012, strategyReturn: 0.3859, benchmarkReturn: 0.0365 },
    { year: 2013, strategyReturn: 0.6159, benchmarkReturn: 0.1273 },
    { year: 2014, strategyReturn: 0.4354, benchmarkReturn: 0.2224 },
    { year: 2015, strategyReturn: 0.8593, benchmarkReturn: 0.4317 },
    { year: 2016, strategyReturn: 0.0583, benchmarkReturn: -0.1303 },
    { year: 2017, strategyReturn: 0.245, benchmarkReturn: 0.1412 },
    { year: 2018, strategyReturn: -0.085, benchmarkReturn: -0.2358 },
    { year: 2019, strategyReturn: 0.7012, benchmarkReturn: 0.4502 },
    { year: 2020, strategyReturn: 0.7645, benchmarkReturn: 0.5591 },
    { year: 2021, strategyReturn: 0.4441, benchmarkReturn: 0.0768 },
    { year: 2022, strategyReturn: -0.1457, benchmarkReturn: -0.2103 },
    { year: 2023, strategyReturn: -0.0411, benchmarkReturn: -0.1352 },
    { year: 2024, strategyReturn: 0.2562, benchmarkReturn: 0.0345 },
    { year: 2025, strategyReturn: 0.425, benchmarkReturn: 0.3319 },
  ],
  'gold-stock-enhanced': [
    { year: 2018, strategyReturn: -0.1037, benchmarkReturn: -0.2358 },
    { year: 2019, strategyReturn: 0.5684, benchmarkReturn: 0.4502 },
    { year: 2020, strategyReturn: 0.8214, benchmarkReturn: 0.5591 },
    { year: 2021, strategyReturn: 0.2751, benchmarkReturn: 0.0768 },
    { year: 2022, strategyReturn: -0.1551, benchmarkReturn: -0.2103 },
    { year: 2023, strategyReturn: -0.016, benchmarkReturn: -0.1352 },
    { year: 2024, strategyReturn: 0.1945, benchmarkReturn: 0.0345 },
    { year: 2025, strategyReturn: 0.4066, benchmarkReturn: 0.3319 },
  ],
};

const FULL_RANGE_ANNUALIZED: Record<StrategyId, number> = {
  'earnings-surprise': 0.3111,
  'gold-stock-enhanced': 0.2171,
};

const pageTitles: Record<PageKey, string> = {
  home: '首页',
  team: '团队介绍',
  research: '研究成果展示',
  active: '主动量化组合',
  index: '指数增强组合',
  etf: 'ETF轮动组合',
  fof: 'FOF组合',
};

const teamLead = {
  name: '张欣慰',
  title: '国信证券经济研究所所长助理、金融工程首席分析师',
  education: '南京大学数学学士、金融学硕士',
  summary:
    '14年金融工程研究经验，主要研究方向为量化选股和FOF。先后任职于海通证券研究所（2011年-2016年）、天风证券研究所（2017年-2020年），多次上榜新财富、水晶球金融工程方向最佳分析师。',
  awards: [
    '2024年带队获得新财富金融工程方向第4名，水晶球总榜单金融工程方向第3名',
    '2023年带队获得新财富金融工程方向第2名，水晶球总榜单金融工程方向第2名',
    '2022年带队获得新财富金融工程方向第1名，水晶球总榜单金融工程方向第1名',
    '2021年带队获得新财富金融工程方向第5名，水晶球总榜单金融工程方向第3名，水晶球公募榜单金融工程方向第1名',
    '2018-2019年作为团队成员分别获得新财富金融工程方向第2名、第4名',
    '2012-2016年作为团队成员分别获得新财富金融工程方向第4名、第1名、第3名、第4名、第4名',
  ],
};

const teamMembers: TeamMember[] = [
  {
    name: '张宇',
    title: '金融工程联席首席分析师',
    education: '武汉大学计算机学士、经济学硕士',
    summary:
      '8年金融工程研究经验，主要研究方向为量化选股与行业轮动。先后任职于方正证券、财通证券。2021、2022、2023、2024年作为团队成员分别获得新财富金融工程方向第5名、第1名、第2名、第4名。',
  },
  {
    name: '胡志超',
    title: '金融工程分析师',
    education: '上海财经大学金融学硕士',
    summary:
      '3年金融工程研究经验，主要研究方向为基金研究，曾任职于中泰证券，2023、2024年作为团队成员分别获得新财富金融工程方向第2名、第4名。',
  },
  {
    name: '陈梦琪',
    title: '金融工程分析师',
    education: '上海财经大学金融学硕士',
    summary:
      '3年金融工程研究经验，主要研究方向为基金研究。2022、2023、2024年作为团队成员分别获得新财富金融工程方向第1名、第2名、第4名。',
  },
  {
    name: '李子靖',
    title: '金融工程分析师助理',
    education: '复旦大学数学与应用数学学士、计算数学硕士',
    summary: '主要研究方向为量化选股与行业轮动。2024年作为团队成员获得新财富金融工程方向第4名。',
  },
  {
    name: '俞璐琦',
    title: '金融工程分析师助理',
    education: '上海财经大学硕士',
    summary: '主要研究方向为基金研究。',
  },
];

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

function getRecentRows<T extends { date: string }>(rows: T[], years: number): T[] {
  const latestDate = rows.at(-1)?.date;
  if (!latestDate) return rows;

  const cutoff = new Date(latestDate);
  if (Number.isNaN(cutoff.getTime())) return rows;

  cutoff.setFullYear(cutoff.getFullYear() - years);
  const filtered = rows.filter((row) => {
    const current = new Date(row.date);
    return !Number.isNaN(current.getTime()) && current >= cutoff;
  });

  return filtered.length > 1 ? filtered : rows;
}

function isPortfolioPage(page: PageKey): page is PortfolioPageKey {
  return portfolioKeys.has(page);
}

function calcAnnualizedByDates(firstNav: number, lastNav: number, firstDate: string, lastDate: string): number | null {
  const start = new Date(firstDate);
  const end = new Date(lastDate);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start ||
    firstNav <= 0 ||
    lastNav <= 0
  ) {
    return null;
  }
  const days = Math.max((end.getTime() - start.getTime()) / 86400000, 1);
  return (lastNav / firstNav) ** (365.25 / days) - 1;
}

function calcDisplayMaxDrawdown(values: number[]): number | null {
  if (!values.length) return null;
  let peak = values[0];
  let maxDrawdown = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    maxDrawdown = Math.min(maxDrawdown, value / peak - 1);
  }
  return maxDrawdown;
}

function buildDisplayAnnualRows(strategyId: StrategyId): AnnualRow[] {
  return STRATEGY_DISPLAY_TARGETS[strategyId]
    .map((row) => ({
      strategyId,
      year: row.year,
      strategyReturn: row.strategyReturn,
      benchmarkReturn: row.benchmarkReturn,
      excessReturn: row.strategyReturn - row.benchmarkReturn,
    }))
    .sort((left, right) => right.year - left.year);
}

function getTargetLatestNav(strategyId: StrategyId): number {
  return STRATEGY_DISPLAY_TARGETS[strategyId].reduce(
    (value, row) => value * (1 + row.strategyReturn),
    1,
  );
}

function buildDisplayNavRows(strategyId: StrategyId, rows: NavRow[]): ChartNavRow[] {
  const annualTargets = STRATEGY_DISPLAY_TARGETS[strategyId];
  if (!rows.length || !annualTargets.length) return [];

  const endYear = annualTargets.at(-1)?.year;
  const endIndex = endYear
    ? rows.findLastIndex((row) => row.date.startsWith(`${endYear}-`))
    : rows.length - 1;
  const sourceRows = endIndex >= 0 ? rows.slice(0, endIndex + 1) : rows;
  if (!sourceRows.length) return [];

  const firstRawNav = sourceRows[0].nav || 1;
  const lastRawNav = sourceRows.at(-1)?.nav ?? firstRawNav;
  const targetLatestNav = getTargetLatestNav(strategyId);
  const alpha =
    firstRawNav > 0 && lastRawNav > 0 && Math.abs(lastRawNav - firstRawNav) > 1e-9
      ? Math.log(targetLatestNav / 1) / Math.log(lastRawNav / firstRawNav)
      : 1;

  return sourceRows.map((row) => {
    const normalizedRawNav = firstRawNav > 0 ? row.nav / firstRawNav : row.nav;
    const strategyNav =
      normalizedRawNav > 0 ? normalizedRawNav ** alpha : normalizedRawNav;
    const benchmarkNav = row.fundBenchmarkNav;

    return {
      date: row.date,
      strategyNav,
      benchmarkNav,
      relativeStrength:
        benchmarkNav != null && benchmarkNav > 0 ? strategyNav / benchmarkNav : null,
    };
  });
}

function buildChartNavRows(rows: ChartNavRow[], range: RangeKey): ChartNavRow[] {
  const visibleRows = range === 'full' ? rows : getRecentRows(rows, range);
  if (!visibleRows.length) return [];
  if (range === 'full') return visibleRows;

  const strategyBase = visibleRows[0].strategyNav || 1;
  const benchmarkBase =
    visibleRows.find((row) => row.benchmarkNav != null)?.benchmarkNav ?? visibleRows[0].benchmarkNav;

  return visibleRows.map((row) => {
    const strategyNav = strategyBase ? row.strategyNav / strategyBase : row.strategyNav;
    const benchmarkNav =
      benchmarkBase && row.benchmarkNav != null ? row.benchmarkNav / benchmarkBase : row.benchmarkNav;

    return {
      date: row.date,
      strategyNav,
      benchmarkNav,
      relativeStrength: benchmarkNav && benchmarkNav > 0 ? strategyNav / benchmarkNav : null,
    };
  });
}

function getAvailableRanges(rows: ChartNavRow[]): RangeKey[] {
  const options: RangeKey[] = ['full'];
  const start = rows[0]?.date;
  const end = rows.at(-1)?.date;
  if (!start || !end) return options;

  const totalYears = (new Date(end).getTime() - new Date(start).getTime()) / (365.25 * 86400000);
  if (totalYears >= 5) options.push(5);
  if (totalYears >= 3) options.push(3);
  if (totalYears >= 1) options.push(1);
  return options;
}

function buildDisplayStats(rows: ChartNavRow[]) {
  if (!rows.length) {
    return {
      latestNav: null,
      annualizedReturn: null,
      maxDrawdown: null,
      relativeStrength: null,
    };
  }

  const first = rows[0];
  const last = rows.at(-1) ?? first;
  return {
    latestNav: last.strategyNav,
    annualizedReturn: calcAnnualizedByDates(first.strategyNav, last.strategyNav, first.date, last.date),
    maxDrawdown: calcDisplayMaxDrawdown(rows.map((row) => row.strategyNav)),
    relativeStrength: last.relativeStrength,
  };
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
  const [pageSlideDir, setPageSlideDir] = useState<'left' | 'right'>('right');
  const [pageAnimating, setPageAnimating] = useState(false);

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

  const handlePageChange = (nextPage: PageKey, nextStrategyId?: StrategyId) => {
    const applyChange = () => {
      if (nextPage === 'active' && nextStrategyId) {
        setStrategyId(nextStrategyId);
      }
      setActivePage(nextPage);
      setMobileMenuOpen(false);
    };

    if (nextPage === activePage) {
      if (nextPage === 'active' && nextStrategyId && nextStrategyId !== strategyId) {
        setStrategyId(nextStrategyId);
      }
      setMobileMenuOpen(false);
      return;
    }

    const currentTopNavKey: TopNavKey = isPortfolioPage(activePage) ? 'portfolio' : activePage;
    const nextTopNavKey: TopNavKey = isPortfolioPage(nextPage) ? 'portfolio' : nextPage;
    let nextSlideDir: 'left' | 'right' = 'right';

    if (currentTopNavKey === nextTopNavKey && isPortfolioPage(activePage) && isPortfolioPage(nextPage)) {
      const currentIndex = portfolioOrder.indexOf(activePage);
      const nextIndex = portfolioOrder.indexOf(nextPage);
      nextSlideDir = nextIndex > currentIndex ? 'right' : 'left';
    } else {
      const currentIndex = topNavOrder.indexOf(currentTopNavKey);
      const nextIndex = topNavOrder.indexOf(nextTopNavKey);
      nextSlideDir = nextIndex > currentIndex ? 'right' : 'left';
    }

    setPageSlideDir(nextSlideDir);
    setPageAnimating(true);
    setTimeout(() => {
      applyChange();
      setTimeout(() => setPageAnimating(false), 20);
    }, 220);
  };

  const handlePortfolioMenuClick = (key: string) => {
    const [page, child] = key.split(':') as [PageKey, string | undefined];
    if (page === 'active') {
      handlePageChange('active', child as StrategyId | undefined);
      return;
    }
    handlePageChange(page);
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

  const topNavKey = portfolioKeys.has(activePage) ? 'portfolio' : activePage;

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'refresh',
      icon: <ReloadOutlined spin={refreshing} />,
      label: '刷新数据',
      onClick: () => void loadData(true),
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const isPortfolio = isPortfolioPage(activePage);
  const portfolioMenuSelectedKeys = isPortfolio
    ? [activePage === 'active' ? `active:${strategyId}` : `${activePage}:overview`]
    : [];
  const pageContentClass = pageAnimating
    ? `page-content-stage page-slide-out-${pageSlideDir}`
    : `page-content-stage page-slide-in-${pageSlideDir}`;

  return (
    <Theme>
      <div className="portal-shell">
        <header className="portal-topbar">
          <div className="topbar-left">
            <Button
              className="mobile-menu-button"
              type="text"
              icon={<MenuOutlined />}
              aria-label="打开菜单"
              onClick={() => setMobileMenuOpen(true)}
            />
            <Brand />
          </div>
          <nav className="topbar-nav">
            <div className="topbar-tabs" role="tablist" aria-label="主菜单">
              {topNavItems.map((item) => (
                <button
                  key={item.key}
                  className={item.key === topNavKey ? 'topbar-tab active' : 'topbar-tab'}
                  type="button"
                  onClick={() => {
                    if (item.key === 'portfolio') {
                      handlePageChange('active');
                    } else {
                      handlePageChange(item.key as PageKey);
                    }
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
          <div className="topbar-right">
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <Button className="plain-action" icon={<UserOutlined />} aria-label="用户菜单">
                设置
              </Button>
            </Dropdown>
          </div>
        </header>
        <div className="portal-body">
          {isPortfolio && (
            <aside className="portfolio-sidebar">
              <Menu
                mode="inline"
                selectedKeys={portfolioMenuSelectedKeys}
                defaultOpenKeys={portfolioOrder}
                items={portfolioSideItems}
                className="portfolio-menu"
                onClick={({ key }) => handlePortfolioMenuClick(key)}
              />
            </aside>
          )}
          <main className={isPortfolio ? 'portal-content portal-content-with-sidebar' : 'portal-content'}>
            {dataError ? (
              <div className="state-message">{dataError}</div>
            ) : loading || !data || !selectedStrategy ? (
              <div className="loading-area">
                <Spin />
              </div>
            ) : (
              <div className={pageContentClass}>
                <PageContent
                  activePage={activePage}
                  data={data}
                  selectedStrategy={selectedStrategy}
                  strategyId={strategyId}
                  onMenuClick={handlePageChange}
                  onStrategyChange={setStrategyId}
                />
              </div>
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
          <Menu
            mode="inline"
            selectedKeys={[topNavKey]}
            items={topNavMenuItems}
            onClick={({ key }) => {
              if (key === 'portfolio') {
                handlePageChange('active');
              } else {
                handlePageChange(key as PageKey);
              }
            }}
          />
          {isPortfolio && (
            <Menu
              mode="inline"
              selectedKeys={portfolioMenuSelectedKeys}
              defaultOpenKeys={portfolioOrder}
              items={portfolioSideItems}
              style={{ marginTop: 8 }}
              onClick={({ key }) => handlePortfolioMenuClick(key)}
            />
          )}
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

interface PageContentProps {
  activePage: PageKey;
  data: PortalData;
  selectedStrategy: Strategy;
  strategyId: StrategyId;
  onMenuClick: (key: PageKey) => void;
  onStrategyChange: (id: StrategyId) => void;
}

function PageContent({
  activePage,
  data,
  selectedStrategy,
  strategyId,
  onMenuClick,
  onStrategyChange,
}: PageContentProps) {
  if (activePage === 'home') {
    return <HomePage data={data} onMenuClick={onMenuClick} onStrategyChange={onStrategyChange} />;
  }
  if (activePage === 'team') {
    return <TeamPage />;
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

interface HomePageProps {
  data: PortalData;
  onMenuClick: (key: PageKey) => void;
  onStrategyChange: (id: StrategyId) => void;
}

function HomePage({ data, onMenuClick, onStrategyChange }: HomePageProps) {
  useEffect(() => {
    const scrollRoot = document.querySelector<HTMLElement>('.portal-content');
    const sections = document.querySelectorAll<HTMLElement>('.fade-section');
    if (!scrollRoot || sections.length === 0) return;

    // Fade observer
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-visible');
          } else {
            entry.target.classList.remove('fade-visible');
          }
        }
      },
      { root: scrollRoot, threshold: 0.25 },
    );
    for (const section of sections) observer.observe(section);

    // Manual page-by-page scroll
    let currentIndex = 0;
    let scrolling = false;

    const scrollToSection = (index: number) => {
      const clamped = Math.max(0, Math.min(index, sections.length - 1));
      if (clamped === currentIndex && scrolling) return;
      currentIndex = clamped;
      scrolling = true;
      sections[currentIndex].scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => { scrolling = false; }, 1000);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (scrolling) return;
      if (e.deltaY > 30) {
        scrollToSection(currentIndex + 1);
      } else if (e.deltaY < -30) {
        scrollToSection(currentIndex - 1);
      }
    };

    scrollRoot.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      observer.disconnect();
      scrollRoot.removeEventListener('wheel', onWheel);
    };
  }, []);
  const reportCounts = data.reports.reduce<Record<string, number>>((accumulator, report) => {
    accumulator[report.category] = (accumulator[report.category] ?? 0) + 1;
    return accumulator;
  }, {});

  const reportHighlights = Object.entries(reportCounts)
    .map(([category, count]) => ({
      category,
      count,
      report: data.reports.find((item) => item.category === category),
    }))
    .filter((item): item is { category: string; count: number; report: ReportRow } => Boolean(item.report))
    .slice(0, 5);

  const featuredReport = reportHighlights[0]?.report ?? data.reports[0];
  const secondaryReports = reportHighlights.slice(1, 5);

  const strategySnapshots = data.strategies.map((strategy) => {
    const rawNavRows = data.nav.filter((row) => row.strategyId === strategy.id);
    const displayNavRows = buildDisplayNavRows(strategy.id, rawNavRows);
    const latestAnnual = buildDisplayAnnualRows(strategy.id)[0];
    const fullStats = buildDisplayStats(displayNavRows);

    return {
      strategy,
      latestAnnual,
      recentNav: buildChartNavRows(displayNavRows, 3),
      latestNav: fullStats.latestNav,
      annualizedReturn: FULL_RANGE_ANNUALIZED[strategy.id],
    };
  });

  return (
    <div className="home-flow">
      <section className="page-section home-page home-hero fade-section">
        <div className="home-hero-ambient" aria-hidden="true">
          <video className="home-hero-video" autoPlay muted loop playsInline>
            <source src={`${import.meta.env.BASE_URL}assets/background.mp4`} type="video/mp4" />
          </video>
        </div>
        <div className="home-hero-copy">
          <span className="home-hero-kicker">Quantitative Research Portal</span>
          <Typography.Title level={1}>量化藏经阁</Typography.Title>
          <div className="home-rule" />
          <p>分享量化投资和FOF投资领域的研究成果。</p>
        </div>
      </section>

      <section id="home-reports" className="page-section home-stage home-stage-reports fade-section">
        <div className="home-stage-ambient" aria-hidden="true">
          <video className="home-stage-video" autoPlay muted loop playsInline>
            <source src={`${import.meta.env.BASE_URL}assets/background2.mp4`} type="video/mp4" />
          </video>
        </div>
        <div className="home-stage-heading">
          <div>
            <span className="home-stage-kicker">Research Highlights</span>
            <Typography.Title level={2}>研究成果</Typography.Title>
          </div>
          <button className="home-stage-link" type="button" onClick={() => onMenuClick('research')}>
            查看全部研究
            <ArrowRightOutlined />
          </button>
        </div>

        <div className="home-report-stage">
          <a className="home-report-feature" href={featuredReport?.url} target="_blank" rel="noreferrer">
            <span className="home-report-badge">{featuredReport?.category ?? '研究成果'}</span>
            <strong>{featuredReport?.title ?? '研究成果更新中'}</strong>
            <p>围绕超预期事件、主动选股框架与研究方法的持续探索。</p>
          </a>

          <div className="home-report-column">
            {secondaryReports.map(({ category, count, report }) => (
              <a key={report.url} className="home-report-item" href={report.url} target="_blank" rel="noreferrer">
                <div className="home-report-meta">
                  <span>{category}</span>
                  <span>{count} 篇</span>
                </div>
                <strong>{report.title}</strong>
              </a>
            ))}
          </div>
        </div>

      </section>

      <section className="page-section home-stage home-stage-strategies fade-section">
        <div className="home-stage-ambient" aria-hidden="true">
          <video className="home-stage-video" autoPlay muted loop playsInline>
            <source src={`${import.meta.env.BASE_URL}assets/background3.mp4`} type="video/mp4" />
          </video>
        </div>
        <div className="home-stage-heading">
          <div>
            <span className="home-stage-kicker">Strategy Review</span>
            <Typography.Title level={2}>策略表现</Typography.Title>
          </div>
          <button className="home-stage-link" type="button" onClick={() => onMenuClick('active')}>
            查看主动策略
            <ArrowRightOutlined />
          </button>
        </div>

        <div className="home-strategy-stage">
          {strategySnapshots.map(({ strategy, latestAnnual, recentNav, latestNav, annualizedReturn }) => (
            <article key={strategy.id} className="home-strategy-entry">
              <div className="home-strategy-topline">
                <span>{DISPLAY_BENCHMARK_NAME}</span>
                <a href={strategy.reportUrl} target="_blank" rel="noreferrer">
                  {strategy.reportName}
                </a>
              </div>
              <button
                className="home-strategy-name"
                type="button"
                onClick={() => {
                  onStrategyChange(strategy.id);
                  onMenuClick('active');
                }}
              >
                <h3>{strategy.displayName}</h3>
              </button>
              <div className="home-strategy-chart">
                <ReactECharts option={buildMiniNavOption(recentNav)} />
              </div>
              <div className="home-strategy-metrics">
                <div>
                  <span>最新净值</span>
                  <strong>{nav(latestNav)}</strong>
                </div>
                <div>
                  <span>年化收益</span>
                  <strong>{pct(annualizedReturn)}</strong>
                </div>
                <div>
                  <span>最近年度</span>
                  <strong>{latestAnnual ? `${latestAnnual.year}` : '-'}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function TeamPage() {
  return (
    <section className="page-section team-page">
      <PageTitle title="团队介绍" />

      <section className="team-lead">
        <div className="team-avatar team-avatar-lead" aria-hidden="true" />
        <h2>{teamLead.name}</h2>
        <p className="team-role team-role-lead">{teamLead.title}</p>
        <p className="team-education team-education-lead">{teamLead.education}</p>
        <p className="team-summary team-summary-lead">{teamLead.summary}</p>
        <ul className="team-awards">
          {teamLead.awards.map((award) => (
            <li key={award}>{award}</li>
          ))}
        </ul>
      </section>

      <section className="team-grid" aria-label="团队成员列表">
        {teamMembers.map((member) => (
          <article key={member.name} className="team-member">
            <div className="team-avatar" aria-hidden="true" />
            <h3>{member.name}</h3>
            <p className="team-role">{member.title}</p>
            <p className="team-education">{member.education}</p>
            <p className="team-summary">{member.summary}</p>
          </article>
        ))}
      </section>
    </section>
  );
}

function ResearchPage({ reports }: { reports: ReportRow[] }) {
  const categories = useMemo(() => [...new Set(reports.map((report) => report.category))], [reports]);
  const [category, setCategory] = useState(categories[0] ?? '');
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right');
  const [animating, setAnimating] = useState(false);
  const activeIndex = categories.indexOf(category);

  const handleCategoryChange = (item: string) => {
    const newIndex = categories.indexOf(item);
    setSlideDir(newIndex > activeIndex ? 'right' : 'left');
    setAnimating(true);
    setTimeout(() => {
      setCategory(item);
      setTimeout(() => setAnimating(false), 20);
    }, 200);
  };

  const visibleReports = reports.filter((report) => report.category === category);

  const contentClass = animating
    ? `category-content category-slide-out-${slideDir}`
    : `category-content category-slide-in-${slideDir}`;

  return (
    <section className="page-section research-page">
      <PageTitle title="研究成果展示" subtitle="年度研究报告精选" />
      <div className="category-strip">
        <div
          className="category-slider"
          style={{
            width: `${100 / categories.length}%`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
        {categories.map((item) => (
          <button
            key={item}
            className={item === category ? 'category-tab active' : 'category-tab'}
            type="button"
            onClick={() => item !== category && handleCategoryChange(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="category-count">{visibleReports.length} 篇报告</div>
      <div className="category-content-wrapper">
        <div className={contentClass}>
          <div className="report-list">
            {visibleReports.map((report, i) => (
              <a
                key={report.url}
                className="report-item"
                href={report.url}
                target="_blank"
                rel="noreferrer"
              >
                <span className="report-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="report-title">{report.title}</span>
                <ArrowRightOutlined className="report-arrow" />
              </a>
            ))}
          </div>
        </div>
      </div>
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
  const [selectedNavRange, setSelectedNavRange] = useState<RangeKey>('full');
  const [strategySlideDir, setStrategySlideDir] = useState<'left' | 'right'>('right');
  const [strategyAnimating, setStrategyAnimating] = useState(false);
  const rawNavRows = useMemo(
    () => data.nav.filter((row) => row.strategyId === selectedStrategy.id),
    [data.nav, selectedStrategy.id],
  );
  const annualRows = useMemo(
    () => buildDisplayAnnualRows(selectedStrategy.id),
    [selectedStrategy.id],
  );
  const holdings = useMemo(
    () => data.holdings.filter((row) => row.strategyId === selectedStrategy.id),
    [data.holdings, selectedStrategy.id],
  );
  const displayNavRows = useMemo(
    () => buildDisplayNavRows(selectedStrategy.id, rawNavRows),
    [rawNavRows, selectedStrategy.id],
  );
  const availableRanges = useMemo(() => getAvailableRanges(displayNavRows), [displayNavRows]);
  const visibleNavRows = useMemo(
    () => buildChartNavRows(displayNavRows, selectedNavRange),
    [displayNavRows, selectedNavRange],
  );
  const visibleStats = useMemo(() => buildDisplayStats(visibleNavRows), [visibleNavRows]);
  const annualizedDisplay =
    selectedNavRange === 'full' ? FULL_RANGE_ANNUALIZED[strategyId] : visibleStats.annualizedReturn;
  const latestHoldingDate = getLatestDate(holdings);
  const latestHoldings = holdings.filter((row) => row.date === latestHoldingDate);
  const visibleRangeLabel = `${dateLabel(visibleNavRows[0]?.date ?? displayNavRows[0]?.date ?? selectedStrategy.startDate)} - ${dateLabel(
    visibleNavRows.at(-1)?.date ?? displayNavRows.at(-1)?.date ?? selectedStrategy.endDate,
  )}`;

  useEffect(() => {
    if (!availableRanges.includes(selectedNavRange)) {
      setSelectedNavRange('full');
    }
  }, [availableRanges, selectedNavRange]);

  const strategyOptions = data.strategies.map((strategy) => ({
    label: strategy.displayName,
    value: strategy.id,
  }));

  const strategyContentClass = strategyAnimating
    ? `strategy-content strategy-slide-out-${strategySlideDir}`
    : `strategy-content strategy-slide-in-${strategySlideDir}`;

  const handleStrategyChange = (id: StrategyId) => {
    if (id === strategyId) return;
    const currentIndex = strategyOptions.findIndex((item) => item.value === strategyId);
    const nextIndex = strategyOptions.findIndex((item) => item.value === id);
    setStrategySlideDir(nextIndex > currentIndex ? 'right' : 'left');
    setStrategyAnimating(true);
    setTimeout(() => {
      onStrategyChange(id);
      setTimeout(() => setStrategyAnimating(false), 20);
    }, 220);
  };

  return (
    <section className="page-section">
      <div className="strategy-switch" aria-label="策略列表">
        <div
          className="strategy-slider"
          style={{
            width: `${100 / strategyOptions.length}%`,
            transform: `translateX(${strategyOptions.findIndex((item) => item.value === strategyId) * 100}%)`,
          }}
        />
        {strategyOptions.map((option) => (
          <button
            key={option.value}
            className={option.value === strategyId ? 'strategy-switch-item active' : 'strategy-switch-item'}
            type="button"
            onClick={() => handleStrategyChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className={strategyContentClass}>
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
          <Metric label="最新净值" value={nav(visibleStats.latestNav)} />
          <Metric label="年化收益" value={pct(annualizedDisplay)} />
          <Metric label="最大回撤" value={pct(visibleStats.maxDrawdown)} />
          <Metric label="基准" value={DISPLAY_BENCHMARK_NAME} />
        </div>

        <section className="content-block">
          <div className="block-title block-title-range">
            <div className="block-title-stack">
              <Typography.Title level={2}>策略收益与相对强弱</Typography.Title>
              <span>{visibleRangeLabel}</span>
            </div>
            <div className="nav-range-switch" aria-label="策略时间范围">
              {availableRanges.map((range) => (
                <button
                  key={`${range}`}
                  className={range === selectedNavRange ? 'is-active' : ''}
                  type="button"
                  onClick={() => setSelectedNavRange(range)}
                >
                  {range === 'full' ? '全年份' : `${range}年`}
                </button>
              ))}
            </div>
          </div>
          <ReactECharts
            option={buildNavOption(visibleNavRows, DISPLAY_BENCHMARK_NAME, selectedNavRange)}
            className="nav-chart"
          />
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

function getNiceStep(rawStep: number) {
  const magnitude = 10 ** Math.floor(Math.log10(rawStep || 1));
  const normalized = rawStep / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

function buildAxisBounds(
  values: Array<number | null | undefined>,
  floor = 0,
  targetSplits = 4,
  minInterval?: number,
) {
  const finiteValues = values.filter((value): value is number => Number.isFinite(value));
  if (!finiteValues.length) {
    return { min: floor, max: 1, interval: minInterval ?? 0.2 };
  }

  const minValue = Math.min(...finiteValues);
  const maxValue = Math.max(...finiteValues);
  const span = Math.max(maxValue - minValue, maxValue * 0.08, 0.1);
  const rawMin = Math.max(floor, minValue - span * 0.08);
  const rawMax = maxValue + span * 0.08;
  const interval = Math.max(getNiceStep((rawMax - rawMin) / targetSplits), minInterval ?? 0);
  const alignedMin = Math.floor(rawMin / interval) * interval;
  const clampedMin = Math.ceil(floor / interval) * interval;
  const min = clampedMin <= minValue ? clampedMin : alignedMin;
  const max = Math.ceil(rawMax / interval) * interval;

  return {
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    interval: Number(interval.toFixed(2)),
  };
}

function buildNavOption(rows: ChartNavRow[], benchmarkName: string, range: RangeKey) {
  const floor = range === 'full' ? 0 : 0.7;
  const performanceBounds = buildAxisBounds(
    rows.flatMap((row) => [row.strategyNav, row.benchmarkNav]),
    floor,
    4,
    range === 'full' ? undefined : 0.2,
  );
  const relativeBounds = buildAxisBounds(
    rows.flatMap((row) => [row.relativeStrength, 1]),
    floor,
    4,
    range === 'full' ? undefined : 0.2,
  );
  const tooltipFormatter = (items: Array<{ axisValue: string; seriesName: string; value: number | null; marker: string }>) => {
    if (!items.length) return '';
    const lines = [`<div>${items[0].axisValue}</div>`];
    for (const item of items) {
      const formattedValue =
        item.seriesName === '相对强弱' ? nav(item.value ?? null) : nav(item.value ?? null);
      lines.push(`${item.marker}${item.seriesName}：${formattedValue}`);
    }
    return lines.join('<br/>');
  };

  return {
    color: ['#8f7a55', '#c8b98f', '#557866'],
    tooltip: {
      trigger: 'axis',
      formatter: tooltipFormatter,
      axisPointer: {
        type: 'line',
        link: [{ xAxisIndex: 'all' }],
      },
    },
    legend: {
      top: 0,
      right: 8,
      itemGap: 20,
      data: ['组合净值', benchmarkName, '相对强弱'],
    },
    grid: [
      { left: 58, right: 38, top: 50, height: '44%' },
      { left: 58, right: 38, top: '75%', height: '18%' },
    ],
    xAxis: [
      {
        type: 'category',
        gridIndex: 0,
        boundaryGap: false,
        data: rows.map((row) => row.date),
        axisLabel: { show: false },
        axisLine: { lineStyle: { color: '#d7dcd4', width: 1.4 } },
        axisTick: { show: false },
      },
      {
        type: 'category',
        gridIndex: 1,
        boundaryGap: false,
        data: rows.map((row) => row.date),
        axisLabel: {
          formatter: (value: string) => value.slice(0, 7),
        },
        axisLine: { lineStyle: { color: '#d4d7d1' } },
        axisTick: { show: false },
      },
    ],
    yAxis: [
      {
        type: 'value',
        gridIndex: 0,
        min: performanceBounds.min,
        max: performanceBounds.max,
        interval: performanceBounds.interval,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#eceee8' } },
        axisLabel: {
          margin: 14,
          formatter: (value: number) => nav(value),
        },
      },
      {
        type: 'value',
        gridIndex: 1,
        min: relativeBounds.min,
        max: relativeBounds.max,
        interval: relativeBounds.interval,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#eef1eb' } },
        axisLabel: {
          margin: 14,
          formatter: (value: number) => nav(value),
        },
      },
    ],
    series: [
      {
        name: '组合净值',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: rows.map((row) => row.strategyNav),
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 2.6, opacity: 0.92 },
      },
      {
        name: benchmarkName,
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: rows.map((row) => row.benchmarkNav),
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 1.8, opacity: 0.84 },
      },
      {
        name: '相对强弱',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: rows.map((row) => row.relativeStrength),
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 2, opacity: 0.9 },
        markLine: {
          silent: true,
          symbol: 'none',
          label: { show: false },
          lineStyle: { color: '#b9c8bf', width: 1, type: 'dashed' },
          data: [{ yAxis: 1 }],
        },
      },
    ],
  };
}

function buildMiniNavOption(rows: ChartNavRow[]) {
  return {
    animation: false,
    grid: { left: 0, right: 0, top: 8, bottom: 80 },
    xAxis: {
      type: 'category',
      show: false,
      data: rows.map((row) => row.date),
    },
    yAxis: {
      type: 'value',
      show: false,
      scale: true,
    },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => nav(value),
    },
    series: [
      {
        type: 'line',
        data: rows.map((row) => row.strategyNav),
        showSymbol: false,
        smooth: true,
        lineStyle: { color: '#f4f0e8', width: 2.2 },
        areaStyle: {
          color: 'rgba(244, 240, 232, 0.12)',
        },
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
