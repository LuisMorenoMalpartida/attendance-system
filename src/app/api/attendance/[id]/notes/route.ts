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

    const { id } = await params;
    const recordId = parseInt(id);
    const { notes } = await req.json();

    // Verificar que el registro pertenece al usuario
    const record = await db.query(
      'SELECT * FROM attendance_records WHERE id = $1 AND user_id = $2',
      [recordId, user.userId]
    );

    if (record.rows.length === 0) {
      return NextResponse.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    const result = await db.query(
      'UPDATE attendance_records SET notes = $1 WHERE id = $2 RETURNING *',
      [notes, recordId]
    );

    return NextResponse.json({
      message: 'Nota actualizada',
      record: result.rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar nota:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}