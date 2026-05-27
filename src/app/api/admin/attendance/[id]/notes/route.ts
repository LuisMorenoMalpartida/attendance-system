import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params; // 👈 await aquí
    const recordId = parseInt(id);
    const { notes } = await req.json();

    const result = await db.query(
      `UPDATE attendance_records 
       SET notes = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [notes, recordId, user.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Nota actualizada',
      record: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar nota:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}