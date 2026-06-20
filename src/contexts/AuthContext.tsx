import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { hashPassword } from '../utils/helpers';

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string, users: User[]) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = 'sfa_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) { try { return JSON.parse(raw); } catch { return null; } }
    return null;
  });

  function login(username: string, password: string, users: User[]): boolean {
    const hash = hashPassword(password);
    const user = users.find(u => u.username === username && u.passwordHash === hash);
    if (user) {
      setCurrentUser(user);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return true;
    }
    return false;
  }

  function logout() {
    setCurrentUser(null);
    sessionStorage.removeItem(SESSION_KEY);
  }

  return <AuthContext.Provider value={{ currentUser, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
