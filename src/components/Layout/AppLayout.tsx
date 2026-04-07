import { Layout, Menu } from 'antd';
import {
  BarChartOutlined,
  FundOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  PieChartOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Sider, Content, Header } = Layout;

const menuItems = [
  { key: '/', icon: <BarChartOutlined />, label: '股票池数量' },
  { key: '/single-factor', icon: <ExperimentOutlined />, label: '单因子检验结果' },
  { key: '/single-factor-detail', icon: <FileSearchOutlined />, label: '单因子中间数据' },
  { key: '/composite', icon: <FundOutlined />, label: '复合因子检验' },
  { key: '/weights', icon: <PieChartOutlined />, label: '因子权重' },
  { key: '/portfolio', icon: <TrophyOutlined />, label: '组合表现' },
];

export default function AppLayout() {
  const nav = useNavigate();
  const loc = useLocation();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="dark" breakpoint="lg" collapsedWidth={60}>
        <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>
          因子选股系统
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[loc.pathname]}
          items={menuItems}
          onClick={({ key }) => nav(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0', fontSize: 16, fontWeight: 600 }}>
          多因子选股回测系统
        </Header>
        <Content style={{ margin: 16, padding: 24, background: '#fff', borderRadius: 8, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
