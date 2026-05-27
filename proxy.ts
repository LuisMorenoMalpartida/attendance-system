import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default_secret_change_this'
);

// Rutas públicas que no requieren autenticación
const publicRoutes = ['/', '/login', '/api/auth/login'];

// Rutas protegidas por rol
const adminRoutes = ['/admin'];
const userRoutes = ['/user'];

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    // Si ya está autenticado y trata de ir al login, redirigir a su dashboard
    if ((pathname === '/' || pathname === '/login') && token) {
      const payload = await verifyToken(token);
      if (payload) {
        const role = payload.role as string;
        const dashboardUrl = new URL(
          role === 'admin' ? '/admin' : '/user',
          request.url
        );
        return NextResponse.redirect(dashboardUrl);
      }
    }
    return NextResponse.next();
  }

  // Verificar autenticación para rutas protegidas
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(token);

  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }

  const userRole = payload.role as string;

  // Validar acceso a rutas de admin
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (userRole !== 'admin') {
      const userDashboardUrl = new URL('/user', request.url);
      return NextResponse.redirect(userDashboardUrl);
    }
  }

  // Validar acceso a rutas de usuario
  if (userRoutes.some(route => pathname.startsWith(route))) {
    if (userRole !== 'user' && userRole !== 'admin') {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}