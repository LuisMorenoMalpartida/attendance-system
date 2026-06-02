import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// GET - Obtener horarios de un usuario
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    const result = await db.query(
      `SELECT * FROM work_schedules 
       WHERE user_id = $1 
       ORDER BY day_of_week`,
      [userId]
    );

    return NextResponse.json({ schedules: result.rows });
  } catch (error) {
    console.error('Error al obtener horarios:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PUT - Actualizar horarios de un usuario
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);
    const { schedules } = await req.json();
    // schedules: Array<{ day_of_week: number, start_time: string, end_time: string, is_active: boolean }>

    // Eliminar horarios existentes
    await db.query('DELETE FROM work_schedules WHERE user_id = $1', [userId]);

    // Insertar nuevos horarios
    for (const schedule of schedules) {
      if (schedule.is_active) {
        await db.query(
          `INSERT INTO work_schedules (user_id, day_of_week, start_time, end_time, tolerance_minutes, is_active)
           VALUES ($1, $2, $3, $4, 15, true)`,
          [userId, schedule.day_of_week, schedule.start_time, schedule.end_time]
        );
      }
    }

    return NextResponse.json({ message: 'Horarios actualizados exitosamente' });
  } catch (error) {
    console.error('Error al actualizar horarios:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}