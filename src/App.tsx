import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { UIProvider } from '@/context/UIContext';
import { ScanProvider } from '@/context/ScanContext';

// Import your other pages
import ComparePage from '@/app/reports/compare/page';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
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
    return <Navigate to="/login" replace />;
  }
  
  return <MainLayout>{children}</MainLayout>;
}

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/reports/compare" element={<ProtectedRoute><ComparePage /></ProtectedRoute>} />
      
      {/* Add more routes as needed */}
    </Routes>
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