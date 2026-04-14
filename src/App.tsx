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
type RangeKey = 10 | 5 | 3 | 1;

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

interface TeamMember {
  name: string;
  title: string;
  education: string;
  summary: string;
}

const topNavItems: MenuProps['items'] = [
  { key: 'home', label: '首页' },
  { key: 'team', label: '团队介绍' },
  { key: 'research', label: '研究成果展示' },
  { key: 'portfolio', label: '投资组合' },
];

const portfolioSideItems: MenuProps['items'] = [
  { key: 'active', icon: <FundProjectionScreenOutlined />, label: '主动量化组合' },
  { key: 'index', icon: <FileTextOutlined />, label: '指数增强组合' },
  { key: 'etf', icon: <FileTextOutlined />, label: 'ETF轮动组合' },
  { key: 'fof', icon: <FileTextOutlined />, label: 'FOF组合' },
];

const portfolioKeys = new Set<PageKey>(['active', 'index', 'etf', 'fof']);

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
    name: '杨昕宇',
    title: '金融工程分析师',
    education: '同济大学管理学学士、加州大学洛杉矶分校金融工程硕士',
    summary:
      '主要研究方向为基金研究和资产配置。2023、2024年作为团队成员分别获得新财富金融工程方向第2名、第4名。',
  },
  {
    name: '李子靖',
    title: '金融工程分析师助理',
    education: '复旦大学数学与应用数学学士、计算数学硕士',
    summary: '主要研究方向为量化选股与行业轮动。2024年作为团队成员获得新财富金融工程方向第4名。',
  },
  {
    name: '俞路琦',
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

function getRecentNavRows(rows: NavRow[], years: number): NavRow[] {
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

  const isPortfolio = portfolioKeys.has(activePage);

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
            <Menu
              mode="horizontal"
              selectedKeys={[topNavKey]}
              items={topNavItems}
              className="top-menu"
              onClick={({ key }) => {
                if (key === 'portfolio') {
                  handleMenuClick('active');
                } else {
                  handleMenuClick(key as PageKey);
                }
              }}
            />
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
                selectedKeys={[activePage]}
                items={portfolioSideItems}
                className="portfolio-menu"
                onClick={({ key }) => handleMenuClick(key as PageKey)}
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
              <PageContent
                activePage={activePage}
                data={data}
                selectedStrategy={selectedStrategy}
                strategyId={strategyId}
                onMenuClick={handleMenuClick}
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
          <Menu
            mode="inline"
            selectedKeys={[topNavKey]}
            items={topNavItems}
            onClick={({ key }) => {
              if (key === 'portfolio') {
                handleMenuClick('active');
              } else {
                handleMenuClick(key as PageKey);
              }
            }}
          />
          {isPortfolio && (
            <Menu
              mode="inline"
              selectedKeys={[activePage]}
              items={portfolioSideItems}
              style={{ marginTop: 8 }}
              onClick={({ key }) => handleMenuClick(key as PageKey)}
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
    const navRows = data.nav.filter((row) => row.strategyId === strategy.id);
    const latestAnnual = data.annual
      .filter((row) => row.strategyId === strategy.id && row.strategyReturn != null)
      .sort((left, right) => right.year - left.year)[0];

    return {
      strategy,
      latestAnnual,
      recentNav: getRecentNavRows(navRows, 3),
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
          {strategySnapshots.map(({ strategy, latestAnnual, recentNav }) => (
            <article key={strategy.id} className="home-strategy-entry">
              <div className="home-strategy-topline">
                <span>{strategy.benchmarkName}</span>
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
                  <strong>{nav(strategy.latestNav)}</strong>
                </div>
                <div>
                  <span>年化收益</span>
                  <strong>{pct(strategy.annualizedReturn)}</strong>
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
    <section className="page-section">
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
      <div className="category-content-wrapper">
        <div className={contentClass}>
          <div className="report-list">
            {visibleReports.map((report) => (
              <a
                key={report.url}
                className="report-item"
                href={report.url}
                target="_blank"
                rel="noreferrer"
              >
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
  const [selectedNavRange, setSelectedNavRange] = useState<RangeKey>(10);
  const [strategySlideDir, setStrategySlideDir] = useState<'left' | 'right'>('right');
  const [strategyAnimating, setStrategyAnimating] = useState(false);
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
  const visibleNavRows = useMemo(
    () => getRecentNavRows(navRows, selectedNavRange),
    [navRows, selectedNavRange],
  );
  const latestHoldingDate = getLatestDate(holdings);
  const latestHoldings = holdings.filter((row) => row.date === latestHoldingDate);

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
      <PageTitle title="主动量化组合" />
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
          <Metric label="最新净值" value={nav(selectedStrategy.latestNav)} />
          <Metric label="年化收益" value={pct(selectedStrategy.annualizedReturn)} />
          <Metric label="最大回撤" value={pct(selectedStrategy.maxDrawdown)} />
          <Metric label="基准" value={selectedStrategy.benchmarkName} />
        </div>

        <section className="content-block">
          <div className="block-title block-title-range">
            <div className="block-title-stack">
              <Typography.Title level={2}>策略净值</Typography.Title>
              <span>{`${dateLabel(selectedStrategy.startDate)} - ${dateLabel(selectedStrategy.endDate)}`}</span>
            </div>
            <div className="nav-range-switch" aria-label="策略时间范围">
              {[10, 5, 3, 1].map((range) => (
                <button
                  key={range}
                  className={range === selectedNavRange ? 'is-active' : ''}
                  type="button"
                  onClick={() => setSelectedNavRange(range as RangeKey)}
                >
                  {range}年
                </button>
              ))}
            </div>
          </div>
          <ReactECharts option={buildNavOption(visibleNavRows, selectedStrategy.benchmarkName)} className="nav-chart" />
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

function buildMiniNavOption(rows: NavRow[]) {
  return {
    animation: false,
    grid: { left: 0, right: 0, top: 8, bottom: 48 },
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
        data: rows.map((row) => row.nav),
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
