import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

interface AdminInfo {
  username: string;
  company_name: string;
  default_currency: string;
  default_tax_rate: number;
  logo_url?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  admin: AdminInfo | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setAdmin(response.data.admin);
    } catch (error) {
      console.error('Failed to verify token', error);
      localStorage.removeItem('admin_token');
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, admin } = response.data;
      localStorage.setItem('admin_token', token);
      setAdmin(admin);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Authentication failed.';
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setAdmin(null);
  };

  const refreshAdmin = async () => {
    try {
      const response = await api.get('/auth/me');
      setAdmin(response.data.admin);
    } catch (error) {
      console.error('Failed to refresh admin state', error);
    }
  };

  const isAuthenticated = !!admin;

  return (
    <AuthContext.Provider value={{ isAuthenticated, admin, loading, login, logout, refreshAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
