import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import type { AuthUser } from '@/types/auth';

const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default_secret_change_this'
);

const COOKIE_NAME = 'auth-token';
const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 horas en segundos

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey);
}

export async function decrypt(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(userId: number, role: string) {
  const expires = new Date(Date.now() + COOKIE_MAX_AGE * 1000);

  const session = await encrypt({
    userId,
    role,
    expires: expires.toISOString(), // Guardar como string ISO
  });

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function logout() {
  const cookieStore = await cookies();
  
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function verifyAuth(req: NextRequest): Promise<AuthUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await decrypt(token);
  if (!payload) return null;

  // Verificar expiración de forma segura
  if (payload.expires) {
    try {
      // Convertir a Date, maneja string, number o Date
      const expiresDate = new Date(payload.expires as string | number);
      
      // Verificar que sea una fecha válida
      if (!isNaN(expiresDate.getTime()) && expiresDate < new Date()) {
        return null; // Token expirado
      }
    } catch {
      // Si no se puede parsear, ignorar la expiración
      console.warn('No se pudo verificar expiración del token');
    }
  }

  return {
    userId: Number(payload.userId),
    role: payload.role as AuthUser['role'],
    expires: payload.expires?.toString(),
  };
}