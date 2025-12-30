import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Plan, PLAN_LIMITS } from '@/lib/types';
import { mockUser } from '@/lib/mock-data';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updatePlan: (plan: Plan) => void;
  planLimits: typeof PLAN_LIMITS[Plan] | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const stored = localStorage.getItem('uptimepulse_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Mock login - in production, this would call the API
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const userData: User = {
      ...mockUser,
      email,
    };
    
    setUser(userData);
    localStorage.setItem('uptimepulse_user', JSON.stringify(userData));
    setIsLoading(false);
  };

  const signup = async (email: string, password: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const userData: User = {
      id: crypto.randomUUID(),
      email,
      plan: 'free',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      created_at: new Date().toISOString(),
    };
    
    setUser(userData);
    localStorage.setItem('uptimepulse_user', JSON.stringify(userData));
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('uptimepulse_user');
  };

  const updatePlan = (plan: Plan) => {
    if (user) {
      const updated = { ...user, plan };
      setUser(updated);
      localStorage.setItem('uptimepulse_user', JSON.stringify(updated));
    }
  };

  const planLimits = user ? PLAN_LIMITS[user.plan] : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        updatePlan,
        planLimits,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
