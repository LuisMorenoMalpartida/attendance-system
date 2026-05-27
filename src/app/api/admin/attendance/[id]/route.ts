import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(req);

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const recordId = parseInt(id);

    const { type, timestamp, notes, is_manual } = await req.json();

    const result = await db.query(
      `UPDATE attendance_records 
       SET type = $1, timestamp = $2, notes = $3, is_manual = $4, modified_by = $5
       WHERE id = $6
       RETURNING *`,
      [type, timestamp, notes, is_manual || true, admin.userId, recordId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Registro actualizado exitosamente',
      record: result.rows[0]
    });

  } catch (error) {
    console.error('Error al actualizar registro:', error);

    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    );
  }
}