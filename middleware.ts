import { NextRequest } from 'next/server';
import { proxy } from './proxy';

export async function middleware(request: NextRequest) {
  try {
    // Reutiliza la lógica existente en `proxy.ts`
    return await proxy(request as any);
  } catch (err) {
    return new Response('Middleware error', { status: 500 });
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/user/:path*',
    '/api/admin/:path*',
    '/api/user/:path*',
    '/api/attendance/:path*',
    '/api/images/:path*',
  ],
};
