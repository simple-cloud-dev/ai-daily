import { createContext, useContext, useMemo, useState } from 'react';

import type { AuthResponse } from '@ai-daily/types';

import { api } from './lib.api.js';

type AuthContextValue = {
  user: AuthResponse['user'] | null;
  setUser: (user: AuthResponse['user'] | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);

  const value = useMemo(
    () => ({
      user,
      setUser,
      logout: async () => {
        await api.auth.logout();
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
