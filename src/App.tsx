import { Suspense, lazy, startTransition, useMemo, useState } from 'react';
import { ConfigProvider, Spin, theme as antdTheme } from 'antd';
import { DashboardShell } from './components/DashboardShell';
import type { PageKey, PriceVersion, RangePreset, StrategyKey } from './types';
import { ACCENT, PRIMARY } from './utils/colors';

const OverviewPage = lazy(() =>
  import('./pages/OverviewPage').then((module) => ({ default: module.OverviewPage })),
);
const UniversePage = lazy(() =>
  import('./pages/UniversePage').then((module) => ({ default: module.UniversePage })),
);
const FactorInsightsPage = lazy(() =>
  import('./pages/FactorInsightsPage').then((module) => ({
    default: module.FactorInsightsPage,
  })),
);
const CompositePage = lazy(() =>
  import('./pages/CompositePage').then((module) => ({ default: module.CompositePage })),
);
const PerformancePage = lazy(() =>
  import('./pages/PerformancePage').then((module) => ({ default: module.PerformancePage })),
);
const HoldingsPage = lazy(() =>
  import('./pages/HoldingsPage').then((module) => ({ default: module.HoldingsPage })),
);

function App() {
  const [activePage, setActivePage] = useState<PageKey>('overview');
  const [strategy, setStrategy] = useState<StrategyKey>('fixed_combo');
  const [version, setVersion] = useState<PriceVersion>('close_version');
  const [rangePreset, setRangePreset] = useState<RangePreset>('full');

  const pageNode = useMemo(() => {
    switch (activePage) {
      case 'overview':
        return <OverviewPage version={version} rangePreset={rangePreset} />;
      case 'universe':
        return <UniversePage rangePreset={rangePreset} />;
      case 'factors':
        return <FactorInsightsPage rangePreset={rangePreset} />;
      case 'composite':
        return <CompositePage rangePreset={rangePreset} />;
      case 'performance':
        return <PerformancePage version={version} rangePreset={rangePreset} />;
      case 'holdings':
        return <HoldingsPage version={version} rangePreset={rangePreset} />;
      default:
        return null;
    }
  }, [activePage, rangePreset, version]);

  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: PRIMARY,
          colorInfo: ACCENT,
          borderRadius: 14,
          colorBgLayout: '#f4f7fb',
          colorBgContainer: '#ffffff',
          colorBorderSecondary: '#d9e2ec',
          fontFamily:
            '"Aptos", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        },
      }}
    >
      <DashboardShell
        activePage={activePage}
        onPageChange={(key) => startTransition(() => setActivePage(key))}
        strategy={strategy}
        onStrategyChange={setStrategy}
        version={version}
        onVersionChange={setVersion}
        rangePreset={rangePreset}
        onRangePresetChange={setRangePreset}
      >
        <Suspense fallback={<Spin size="large" className="page-loading" />}>
          {pageNode}
        </Suspense>
      </DashboardShell>
    </ConfigProvider>
  );
}

export default App;
