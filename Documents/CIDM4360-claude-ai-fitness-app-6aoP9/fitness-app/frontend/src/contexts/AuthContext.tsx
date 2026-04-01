import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { loginUser, registerUser } from '../api/client';

const TOKEN_KEY = 'auth_token';

interface AuthContextType {
  token: string | null;
  userId: number | null;
  email: string | null;
  hasProfile: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ user_id: number | null; has_profile: boolean }>;
  register: (email: string, password: string) => Promise<{ user_id: number | null; has_profile: boolean }>;
  setHasProfile: (id: number) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function decodeToken(token: string): { sub: string; email: string; user_id: number | null } | null {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [userId, setUserId] = useState<number | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [hasProfile, setHasProfileState] = useState(false);

  useEffect(() => {
    if (token) {
      const payload = decodeToken(token);
      if (!payload || (payload.exp && Date.now() / 1000 > (payload as any).exp)) {
        // Token missing or expired
        clearAuth();
      } else {
        setUserId(payload.user_id);
        setEmail(payload.email);
        setHasProfileState(payload.user_id != null);
        if (payload.user_id) localStorage.setItem('fitness_user_id', String(payload.user_id));
      }
    }
  }, [token]);

  const storeToken = (t: string) => {
    setToken(t);
    localStorage.setItem(TOKEN_KEY, t);
  };

  const clearAuth = () => {
    setToken(null);
    setUserId(null);
    setEmail(null);
    setHasProfileState(false);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('fitness_user_id');
  };

  const login = async (emailInput: string, password: string) => {
    const data = await loginUser(emailInput, password);
    storeToken(data.access_token);
    setUserId(data.user_id);
    setEmail(emailInput.toLowerCase());
    setHasProfileState(data.has_profile);
    if (data.user_id) localStorage.setItem('fitness_user_id', String(data.user_id));
    return { user_id: data.user_id, has_profile: data.has_profile };
  };

  const register = async (emailInput: string, password: string) => {
    const data = await registerUser(emailInput, password);
    storeToken(data.access_token);
    setUserId(null);
    setEmail(emailInput.toLowerCase());
    setHasProfileState(false);
    return { user_id: null, has_profile: false };
  };

  const setHasProfile = (id: number) => {
    setUserId(id);
    setHasProfileState(true);
    localStorage.setItem('fitness_user_id', String(id));
  };

  return (
    <AuthContext.Provider value={{
      token, userId, email, hasProfile, isAuthenticated: !!token,
      login, register, setHasProfile, logout: clearAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
