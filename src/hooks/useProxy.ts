'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProxyState {
  isAuthenticated: boolean;
  userRole: string | null;
  userId: number | null;
  isLoading: boolean;
}

export function useProxy() {
  const router = useRouter();
  const [state, setState] = useState<ProxyState>({
    isAuthenticated: false,
    userRole: null,
    userId: null,
    isLoading: true,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'x-proxy-request': 'true',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setState({
          isAuthenticated: true,
          userRole: data.role,
          userId: data.id,
          isLoading: false,
        });
      } else {
        setState({
          isAuthenticated: false,
          userRole: null,
          userId: null,
          isLoading: false,
        });
        router.push('/login');
      }
    } catch (error) {
      setState({
        isAuthenticated: false,
        userRole: null,
        userId: null,
        isLoading: false,
      });
    }
  };

  const hasAccess = (requiredRole: string) => {
    if (!state.isAuthenticated) return false;
    if (requiredRole === 'admin') return state.userRole === 'admin';
    if (requiredRole === 'user') return state.userRole === 'user' || state.userRole === 'admin';
    return true;
  };

  return {
    ...state,
    hasAccess,
    refresh: checkAuth,
  };
}