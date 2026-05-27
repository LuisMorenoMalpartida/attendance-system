import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default_secret_change_this'
);

const COOKIE_NAME = 'auth-token';

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
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const session = await encrypt({
    userId,
    role,
    expires,
  });

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
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

  cookieStore.delete(COOKIE_NAME);
}

interface AuthUser {
  userId: number;
  role: string;
  expires?: string;
}

export async function verifyAuth(
  req: NextRequest
): Promise<AuthUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = await decrypt(token);

  if (!payload) return null;

  return {
    userId: Number(payload.userId),
    role: String(payload.role),
    expires: payload.expires?.toString(),
  };
}