import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { UIProvider } from '@/context/UIContext';
import { ScanProvider } from '@/context/ScanContext';

function AppContent() {
  const { authState } = useAuth();
  const { isAuthenticated, loading } = authState;
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <LoginPage />;
  }
  
  return (
    <MainLayout>
      <DashboardPage />
    </MainLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <UIProvider>
        <AuthProvider>
          <ScanProvider>
            <AppContent />
          </ScanProvider>
        </AuthProvider>
      </UIProvider>
    </BrowserRouter>
  );
}

export default App;