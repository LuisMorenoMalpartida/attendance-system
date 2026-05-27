import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default_secret_change_this'
);

// Rutas públicas que NO requieren autenticación
const publicPaths = [
  '/login',
  '/auth/login',
  '/register',          
  '/auth/register',     
  '/api/auth/login',
  '/api/auth/register', 
];

// Rutas de assets públicos (siempre permitidas)
const assetPaths = ['/_next', '/favicon.ico', '/fonts', '/images', '/uploads'];

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  // Siempre permitir assets estáticos
  if (assetPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Si está en una ruta pública (login/register)
  if (publicPaths.some(path => pathname.startsWith(path))) {
    // Si ya tiene token válido, redirigir a su dashboard
    if (token && !pathname.includes('register')) {
      const payload = await verifyToken(token);
      if (payload) {
        const role = payload.role as string;
        const dashboardUrl = new URL(
          role === 'admin' ? '/admin' : '/user',
          request.url
        );
        const response = NextResponse.redirect(dashboardUrl);
        
        // Headers para prevenir caché y botón "atrás"
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        
        return response;
      }
    }
    
    // Si no tiene token, permitir acceso al login
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  // Para rutas protegidas
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(token);

  if (!payload) {
    // Token inválido o expirado - limpiar cookie y redirigir
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    response.headers.set('Clear-Site-Data', '"cookies", "storage"');
    return response;
  }

  const userRole = payload.role as string;

  // Proteger rutas de admin
  if (pathname.startsWith('/admin') && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/user', request.url));
  }

  // Proteger rutas de usuario
  if (pathname.startsWith('/user') && userRole !== 'user' && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Headers de seguridad para todas las rutas protegidas
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};