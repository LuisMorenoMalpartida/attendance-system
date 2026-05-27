import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { uploadImage, deleteImage } from '@/lib/upload';

export async function PUT(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const profilePhoto = formData.get('profilePhoto') as File | null;

    if (!profilePhoto || profilePhoto.size === 0) {
      return NextResponse.json(
        { error: 'No se proporcionó ninguna imagen' },
        { status: 400 }
      );
    }

    // Obtener foto actual del usuario
    const currentUser = await db.query(
      'SELECT profile_photo FROM users WHERE id = $1',
      [user.userId]
    );

    if (currentUser.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const oldPhotoUrl = currentUser.rows[0].profile_photo;

    // Subir nueva foto
    const uploadResult = await uploadImage(profilePhoto, `user-${user.userId}`, {
      folder: 'profiles',
      maxSizeMB: 5,
    });

    // Actualizar en la base de datos
    await db.query(
      'UPDATE users SET profile_photo = $1 WHERE id = $2',
      [uploadResult.url, user.userId]
    );

    // Eliminar foto anterior
    if (oldPhotoUrl) {
      await deleteImage(oldPhotoUrl);
    }

    return NextResponse.json({
      message: 'Foto de perfil actualizada exitosamente',
      profile_photo: uploadResult.url,
    });
  } catch (error: any) {
    console.error('Error al actualizar foto:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
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

    // Obtener foto actual
    const currentUser = await db.query(
      'SELECT profile_photo FROM users WHERE id = $1',
      [user.userId]
    );

    if (currentUser.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const photoUrl = currentUser.rows[0].profile_photo;

    // Eliminar de Vercel Blob
    if (photoUrl) {
      await deleteImage(photoUrl);
    }

    // Actualizar base de datos
    await db.query(
      'UPDATE users SET profile_photo = NULL WHERE id = $1',
      [user.userId]
    );

    return NextResponse.json({
      message: 'Foto de perfil eliminada exitosamente',
    });
  } catch (error: any) {
    console.error('Error al eliminar foto:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}