import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAuth(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const userId = parseInt(params.id);
    const formData = await req.formData();
    const file = formData.get('photo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó imagen' }, { status: 400 });
    }

    // Eliminar foto anterior
    const currentUser = await db.query(
      'SELECT profile_photo FROM users WHERE id = $1',
      [userId]
    );

    if (currentUser.rows[0]?.profile_photo) {
      await storage.deleteProfilePhoto(currentUser.rows[0].profile_photo);
    }

    // Subir nueva foto
    const photoUrl = await storage.uploadProfilePhoto(file, userId);

    await db.query(
      'UPDATE users SET profile_photo = $1 WHERE id = $2',
      [photoUrl, userId]
    );

    return NextResponse.json({
      message: 'Foto actualizada por admin',
      photoUrl,
    });
  } catch (error) {
    console.error('Error al subir foto:', error);
    return NextResponse.json(
      { error: 'Error al procesar la imagen' },
      { status: 500 }
    );
  }
}