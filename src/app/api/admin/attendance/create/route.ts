import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAuth(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { user_id, type, timestamp, notes, latitude, longitude, is_manual } = await req.json();

    // Validar datos
    if (!user_id || !type || !timestamp) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    if (!['check_in', 'lunch_out', 'lunch_in', 'check_out'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de registro inválido' }, { status: 400 });
    }

    const result = await db.query(
      `INSERT INTO attendance_records 
       (user_id, type, timestamp, notes, latitude, longitude, is_manual, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [user_id, type, timestamp, notes, latitude, longitude, is_manual || true, admin.userId]
    );

    return NextResponse.json({
      message: 'Registro creado exitosamente',
      record: result.rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error al crear registro:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}