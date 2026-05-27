import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('photo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó imagen' }, { status: 400 });
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato de imagen no permitido. Usa JPG, PNG, WebP o GIF' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'La imagen no debe superar los 5MB' },
        { status: 400 }
      );
    }

    const userId = user.userId as number;

    // Obtener foto actual para eliminar
    const currentUser = await db.query(
      'SELECT profile_photo FROM users WHERE id = $1',
      [userId]
    );

    // Eliminar foto anterior si existe
    if (currentUser.rows[0]?.profile_photo) {
      await storage.deleteProfilePhoto(currentUser.rows[0].profile_photo);
    }

    // Subir nueva foto
    const photoUrl = await storage.uploadProfilePhoto(file, userId);

    // Actualizar en la base de datos
    await db.query(
      'UPDATE users SET profile_photo = $1 WHERE id = $2',
      [photoUrl, userId]
    );

    return NextResponse.json({
      message: 'Foto de perfil actualizada',
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

export async function DELETE(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = user.userId as number;

    const currentUser = await db.query(
      'SELECT profile_photo FROM users WHERE id = $1',
      [userId]
    );

    if (currentUser.rows[0]?.profile_photo) {
      await storage.deleteProfilePhoto(currentUser.rows[0].profile_photo);
    }

    await db.query(
      'UPDATE users SET profile_photo = NULL WHERE id = $1',
      [userId]
    );

    return NextResponse.json({ message: 'Foto de perfil eliminada' });
  } catch (error) {
    console.error('Error al eliminar foto:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la imagen' },
      { status: 500 }
    );
  }
}