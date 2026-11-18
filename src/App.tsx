import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { PersonaDashboard } from './components/dashboard/PersonaDashboard';
import { ToastContainer } from './components/common/ToastContainer';
import { LineageGraphModal } from './components/lineage/LineageGraphModal';
import { LandingPage } from './components/landing/LandingPage';
import { AuthPage } from './components/auth/AuthPage';
import { OnboardingPage } from './components/auth/OnboardingPage';
import { Unauthorized403 } from './components/auth/Unauthorized403';
import { RoleGuard } from './components/auth/RoleGuard';
import { ForcePasswordChangeModal } from './components/auth/ForcePasswordChangeModal';
import { FloatingChatWidget } from './components/chat/FloatingChatWidget';

const MainDashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex overflow-x-hidden font-sans">
      {/* Collapsible Role-Driven Nav Rail */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 overflow-y-auto pb-12">
          <PersonaDashboard />
        </main>
      </div>

      {/* Global Notifications & Modals */}
      <ToastContainer />
      <LineageGraphModal />
      <ForcePasswordChangeModal />
      <FloatingChatWidget />
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
    case '/admin/users':
      return (
        <RoleGuard allowedRoles={['SYSTEM_ADMIN']}>
          <MainDashboardLayout />
        </RoleGuard>
      );
    case '/onboarding':
      return (
        <RoleGuard allowedRoles={['DATA_STEWARD', 'SYSTEM_ADMIN', 'COMPLIANCE_AUDITOR']}>
          <OnboardingPage />
          <ToastContainer />
        </RoleGuard>
      );
    case '/admin/billing':
      return (
        <RoleGuard allowedRoles={['SYSTEM_ADMIN']}>
          <MainDashboardLayout />
        </RoleGuard>
      );
    case '/admin/tenants':
      return (
        <RoleGuard allowedRoles={['SYSTEM_ADMIN']}>
          <MainDashboardLayout />
        </RoleGuard>
      );
    case '/admin/logs':
      return (
        <RoleGuard allowedRoles={['SYSTEM_ADMIN']}>
          <MainDashboardLayout />
        </RoleGuard>
      );
    case '/unauthorized':
      return (
        <>
          <Unauthorized403 allowedRoles={['SYSTEM_ADMIN']} />
          <ToastContainer />
        </>
      );
    case '/dashboard':
    default:
      return (
        <RoleGuard allowedRoles={['DATA_STEWARD', 'SYSTEM_ADMIN', 'COMPLIANCE_AUDITOR']}>
          <MainDashboardLayout />
        </RoleGuard>
      );
  }
};

export function App() {
  return (
    <AppProvider>
      <RouterView />
      <ForcePasswordChangeModal />
    </AppProvider>
  );
}

export default App;
