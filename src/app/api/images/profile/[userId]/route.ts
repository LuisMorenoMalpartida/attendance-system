// src/app/api/users/[userId]/photo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDownloadUrl, put, del } from '@vercel/blob';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// GET - Obtener foto de perfil
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { userId } = await params;

    const result = await db.query(
      'SELECT profile_photo FROM users WHERE id = $1',
      [parseInt(userId)]
    );

    const photoUrl = result.rows[0]?.profile_photo;

    if (!photoUrl) {
      return NextResponse.json({ error: 'Usuario sin foto de perfil' }, { status: 404 });
    }

    console.log('🔍 Generando URL temporal para:', photoUrl);
    
    // SOLO UN ARGUMENTO: la URL completa
    const downloadUrl = await getDownloadUrl(photoUrl);

    console.log(' URL temporal generada:', downloadUrl);
    
    // Redirigir directamente a la URL temporal para que `next/image` pueda cargarla
    return NextResponse.redirect(downloadUrl);
    
  } catch (error: any) {
    console.error(' Error al obtener foto:', error);
    return NextResponse.json({ 
      error: 'Error al obtener la imagen',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// ... PUT y DELETE se quedan igual