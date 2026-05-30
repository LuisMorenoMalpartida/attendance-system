import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// GET - Obtener horarios
export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAuth(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const result = await db.query(
      `SELECT ws.*, u.name as user_name 
       FROM work_schedules ws 
       JOIN users u ON ws.user_id = u.id 
       ORDER BY u.name, ws.day_of_week`
    );

    return NextResponse.json({ schedules: result.rows });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PUT - Actualizar horario
export async function PUT(req: NextRequest) {
  try {
    const admin = await verifyAuth(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { userId, schedules } = await req.json();
    // schedules: [{ day_of_week: 1, start_time: '08:00', end_time: '17:45' }, ...]

    // Eliminar horarios existentes del usuario
    await db.query('DELETE FROM work_schedules WHERE user_id = $1', [userId]);

    // Insertar nuevos horarios
    for (const s of schedules) {
      await db.query(
        `INSERT INTO work_schedules (user_id, day_of_week, start_time, end_time, tolerance_minutes)
         VALUES ($1, $2, $3, $4, 15)`,
        [userId, s.day_of_week, s.start_time, s.end_time]
      );
    }

    return NextResponse.json({ message: 'Horarios actualizados' });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}