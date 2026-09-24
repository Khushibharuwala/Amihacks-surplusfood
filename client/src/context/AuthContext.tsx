import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { fetchApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  demoAccounts: User[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
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
      
      // Auto-select first donor account if no user is set yet
      const savedUserId = localStorage.getItem('demo_user_id');
      if (savedUserId) {
        const found = data.users.find((u) => u.id === savedUserId);
        if (found) setUser(found);
      } else if (data.users.length > 0) {
        // Default to Donor 1
        const donor1 = data.users.find((u) => u.role === 'DONOR') || data.users[0];
        setUser(donor1);
        localStorage.setItem('demo_user_id', donor1.id);
      }
    } catch (e) {
      console.error('Failed to load demo accounts', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemoAccounts();
  }, []);

  const switchDemoAccount = async (userId: string) => {
    const selected = demoAccounts.find((u) => u.id === userId);
    if (selected) {
      setUser(selected);
      localStorage.setItem('demo_user_id', selected.id);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await fetchApi<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('token', res.token);
    localStorage.removeItem('demo_user_id');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
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
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
