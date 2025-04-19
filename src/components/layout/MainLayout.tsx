import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/toaster';
import { useUI } from '@/context/UIContext';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isSidebarOpen } = useUI();
  
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : ''}`}>
          <div className="container mx-auto p-4 md:p-6">{children}</div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}