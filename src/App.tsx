import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { QuarantineCenter } from './components/quarantine/QuarantineCenter';
import { IngestionHub } from './components/ingestion/IngestionHub';
import { LineageGraph } from './components/lineage/LineageGraph';
import { LineageGraphModal } from './components/lineage/LineageGraphModal';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { ToastContainer } from './components/common/ToastContainer';
import { LandingPage } from './components/landing/LandingPage';
import { AuthPage } from './components/auth/AuthPage';
import { OnboardingPage } from './components/auth/OnboardingPage';

const MainDashboardLayout: React.FC = () => {
  const { activeView } = useApp();

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex overflow-x-hidden font-sans">
      {/* Collapsible Nav Rail */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 overflow-y-auto pb-12">
          {activeView === 'quarantine' && <QuarantineCenter />}
          {activeView === 'ingestion' && <IngestionHub />}
          {activeView === 'lineage' && <LineageGraph />}
          {activeView === 'analytics' && <AnalyticsDashboard />}
        </main>
      </div>

      {/* Global Notifications & Modals */}
      <ToastContainer />
      <LineageGraphModal />
    </div>
  );
};

const RouterView: React.FC = () => {
  const { currentRoute } = useApp();

  switch (currentRoute) {
    case '/':
      return (
        <>
          <LandingPage />
          <ToastContainer />
        </>
      );
    case '/login':
      return (
        <>
          <AuthPage initialMode="login" />
          <ToastContainer />
        </>
      );
    case '/signup':
      return (
        <>
          <AuthPage initialMode="signup" />
          <ToastContainer />
        </>
      );
    case '/onboarding':
      return (
        <>
          <OnboardingPage />
          <ToastContainer />
        </>
      );
    case '/dashboard':
    default:
      return <MainDashboardLayout />;
  }
};

export function App() {
  return (
    <AppProvider>
      <RouterView />
    </AppProvider>
  );
}

export default App;
