import { NextRequest, NextResponse } from 'next/server';
import { head } from '@vercel/blob';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verificar autenticación
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { userId } = await params;

    // Obtener la URL de la foto desde la base de datos
    const result = await db.query(
      'SELECT profile_photo FROM users WHERE id = $1',
      [parseInt(userId)]
    );

    const photoUrl = result.rows[0]?.profile_photo;

    if (!photoUrl) {
      return new NextResponse('No photo', { status: 404 });
    }

    // Extraer pathname y obtener blob con URL temporal
    const urlObj = new URL(photoUrl);
    const pathname = urlObj.pathname.substring(1);
    
    const blob = await head(pathname);
    
    if (!blob) {
      return new NextResponse('Not found', { status: 404 });
    }

    // Redirigir a la URL temporal del blob
    return NextResponse.redirect(blob.url);
  } catch (error) {
    console.error('Error al servir imagen:', error);
    return new NextResponse('Error', { status: 500 });
  }
}