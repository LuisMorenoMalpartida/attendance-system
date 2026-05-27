import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAuth(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { is_active } = await req.json();
    const userId = parseInt(params.id);

    const result = await db.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, name, is_active',
      [is_active, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      message: `Usuario ${is_active ? 'activado' : 'desactivado'} exitosamente`,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}