import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '../types';
import { fetchApi } from '../services/api';

type Role = 'DONOR' | 'NGO' | 'DRIVER';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: Role;
  profileData: Record<string, unknown>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  demoAccounts: User[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  switchDemoAccount: (userId: string) => Promise<void>;
  logout: () => void;
  resetDatabase: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [demoAccounts, setDemoAccounts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDemoAccounts = async () => {
    try {
      const data = await fetchApi<{ users: User[] }>('/auth/demo-accounts');
      setDemoAccounts(data.users);
    } catch (error) {
      console.error('Failed to load demo accounts', error);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('token');
        setToken(null);
      }
    }

    loadDemoAccounts().finally(() => setLoading(false));
  }, []);

  const saveAuthenticatedUser = (response: { token: string; user: User }) => {
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem('token', response.token);
    localStorage.setItem('auth_user', JSON.stringify(response.user));
    localStorage.removeItem('demo_user_id');
  };

  const login = async (email: string, password: string) => {
    const response = await fetchApi<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    saveAuthenticatedUser(response);
  };

  const register = async (data: RegisterData) => {
    const response = await fetchApi<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    saveAuthenticatedUser(response);
  };

  const switchDemoAccount = async (userId: string) => {
    const selected = demoAccounts.find((account) => account.id === userId);

    if (selected) {
      setUser(selected);
      localStorage.setItem('demo_user_id', selected.id);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('demo_user_id');
  };

  const resetDatabase = async () => {
    await fetchApi('/seed/reset', { method: 'POST' });
    await loadDemoAccounts();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        demoAccounts,
        loading,
        login,
        register,
        switchDemoAccount,
        logout,
        resetDatabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};