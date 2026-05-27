import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default_secret_change_this'
);

export async function GET(request: NextRequest) {
  return handleProxyRequest(request);
}

export async function POST(request: NextRequest) {
  return handleProxyRequest(request);
}

export async function PUT(request: NextRequest) {
  return handleProxyRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleProxyRequest(request);
}

async function handleProxyRequest(request: NextRequest) {
  try {
    // Obtener el path original de los headers
    const originalPath = request.headers.get('x-original-path') || '/';
    const token = request.cookies.get('auth-token')?.value;

    // Rutas públicas
    const publicPaths = ['/api/auth/login'];
    if (publicPaths.includes(originalPath)) {
      return NextResponse.next();
    }

    // Verificar token
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const payload = await jwtVerify(token, secretKey);
    const userRole = payload.payload.role as string;

    // Validar acceso según ruta
    if (originalPath.startsWith('/api/admin') && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    // Agregar información del usuario a los headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.payload.userId as string);
    requestHeaders.set('x-user-role', userRole);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error de autenticación' },
      { status: 401 }
    );
  }
}