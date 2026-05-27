import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './auth';

export async function handleProxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Obtener sesión actual
  const session = await getSession();

  // Función helper para crear respuesta de redirección
  const redirectTo = (path: string) => {
    return NextResponse.redirect(new URL(path, request.url));
  };

  // Función helper para continuar con la petición
  const next = () => {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-proxy-handled', 'true');
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  };

  return {
    pathname,
    session,
    redirectTo,
    next,
  };
}

export function isRouteProtected(pathname: string): boolean {
  const protectedPaths = ['/admin', '/user', '/api/attendance', '/api/users'];
  return protectedPaths.some(path => pathname.startsWith(path));
}

export function getRequiredRole(pathname: string): 'admin' | 'user' | null {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/user')) return 'user';
  return null;
}