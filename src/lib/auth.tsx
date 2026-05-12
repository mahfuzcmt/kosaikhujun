'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, authApi, AuthResponse, UserDto } from './api';

interface LoginResult {
  isNewUser: boolean;
  user: UserDto;
  profile: { type: string; profileId: string; status?: string } | null;
}

interface AuthContextType {
  user: UserDto | null;
  isLoading: boolean;
  isNewUser: boolean;
  profile: { type: string; profileId: string; status?: string } | null;
  login: (phone: string, code: string) => Promise<LoginResult>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = api.getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        const response = await authApi.refresh(refreshToken);
        if (response.data) {
          handleAuthSuccess(response.data);
        } else {
          logout();
        }
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = (data: AuthResponse) => {
    api.setToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    setProfile(data.profile || null);
    setIsNewUser(data.isNewUser);
  };

  const login = async (phone: string, code: string): Promise<LoginResult> => {
    const response = await authApi.verifyOtp(phone, code);
    if (response.error) {
      throw new Error(response.error.message);
    }
    if (response.data) {
      handleAuthSuccess(response.data);
      return {
        isNewUser: response.data.isNewUser,
        user: response.data.user,
        profile: response.data.profile || null,
      };
    }
    throw new Error('No response data');
  };

  const logout = () => {
    api.setToken(null);
    localStorage.removeItem('refreshToken');
    setUser(null);
    setProfile(null);
    setIsNewUser(false);
  };

  const refreshAuth = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isNewUser, profile, login, logout, refreshAuth }}>
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
