'use client';

import { ReactNode, useEffect } from 'react';
import { useProxy } from '@/hooks/useProxy';

export default function AuthWrapper({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useProxy();

  // El hook `useProxy` maneja redirección si no está autenticado.
  // Solo renderizamos children mientras el chequeo se realiza.
  if (isLoading) return <>{children}</>;

  return <>{children}</>;
}
