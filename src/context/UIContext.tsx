import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from '@/types';

interface UIContextProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const UIContext = createContext<UIContextProps | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('medvisionDarkMode');
    return savedMode ? JSON.parse(savedMode) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('medvisionDarkMode', JSON.stringify(newMode));
    
    // Apply or remove dark class to document
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Initialize dark mode on mount
  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Toast management
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after 5 seconds unless it's an error
    if (toast.type !== 'error') {
      setTimeout(() => {
        removeToast(id);
      }, 5000);
    }
    
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Sidebar toggle
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  return (
    <UIContext.Provider 
      value={{ 
        darkMode, 
        toggleDarkMode, 
        toasts, 
        addToast, 
        removeToast,
        isSidebarOpen,
        toggleSidebar
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};