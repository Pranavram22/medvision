import React, { createContext, useContext, useState } from 'react';
import { User, AuthState } from '@/types';
import { useUI } from './UIContext';

interface AuthContextProps {
  authState: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  signup: (userData: Partial<User>, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Mock users for development
const MOCK_USERS = {
  patient: {
    id: 'mock-patient-id',
    email: 'patient@medvision.ai',
    name: 'Alice Johnson',
    role: 'patient' as const,
    createdAt: new Date().toISOString(),
  },
  doctor: {
    id: 'mock-doctor-id',
    email: 'doctor@medvision.ai',
    name: 'Dr. John Smith',
    role: 'doctor' as const,
    createdAt: new Date().toISOString(),
  },
  admin: {
    id: 'mock-admin-id',
    email: 'admin@medvision.ai',
    name: 'Admin User',
    role: 'admin' as const,
    createdAt: new Date().toISOString(),
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  });
  
  const { addToast } = useUI();

  const login = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // For development, we'll just check if the email matches one of our mock users
      const lowerEmail = email.toLowerCase();
      let user = null;
      
      if (lowerEmail.includes('patient')) {
        user = MOCK_USERS.patient;
      } else if (lowerEmail.includes('doctor')) {
        user = MOCK_USERS.doctor;
      } else if (lowerEmail.includes('admin')) {
        user = MOCK_USERS.admin;
      }
      
      if (user && password === 'password123') {
        setAuthState({
          user,
          isAuthenticated: true,
          loading: false,
          error: null,
        });
        
        addToast({
          title: 'Welcome back!',
          description: `Logged in as ${user.name}`,
          type: 'success',
        });
        return true;
      }
      
      throw new Error('Invalid email or password');
    } catch (error) {
      setAuthState({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to login',
      });
      
      addToast({
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'Failed to login',
        type: 'error',
      });
      return false;
    }
  };

  const signup = async (userData: Partial<User>, password: string) => {
    // Mock successful signup
    setAuthState({
      user: MOCK_USERS.patient,
      isAuthenticated: true,
      loading: false,
      error: null,
    });
    addToast({
      title: 'Account created!',
      description: 'Successfully created and logged in',
      type: 'success',
    });
  };

  const logout = () => {
    setAuthState({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    });
    addToast({
      title: 'Signed out',
      description: 'You have been signed out',
      type: 'success',
    });
  };

  return (
    <AuthContext.Provider value={{ authState, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};