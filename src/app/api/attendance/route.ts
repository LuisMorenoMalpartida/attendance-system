import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { type, latitude, longitude, deviceInfo, notes } = await req.json();
    const timestamp = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    // Verificar horario laboral
    const schedule = await db.query(
      `SELECT * FROM work_schedules WHERE user_id = $1 AND day_of_week = $2`,
      [user.id, new Date().getDay()]
    );

    // Evitar duplicados consecutivos
    const lastRecord = await db.query(
      `SELECT * FROM attendance_records 
       WHERE user_id = $1 
       AND DATE(timestamp) = $2 
       ORDER BY timestamp DESC LIMIT 1`,
      [user.id, today]
    );

    if (lastRecord.rows.length > 0 && lastRecord.rows[0].type === type) {
      return NextResponse.json(
        { error: 'No se puede registrar el mismo tipo consecutivamente' },
        { status: 400 }
      );
    }

    // Validar flujo diario
    const validFlow = await validateAttendanceFlow(user.id, type, today);
    if (!validFlow.valid) {
      return NextResponse.json(
        { error: validFlow.message },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO attendance_records 
       (user_id, type, timestamp, latitude, longitude, device_info, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [user.id, type, timestamp, latitude, longitude, deviceInfo, notes]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error en registro de asistencia:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

async function validateAttendanceFlow(userId: number, type: string, date: string) {
  const records = await db.query(
    `SELECT * FROM attendance_records 
     WHERE user_id = $1 AND DATE(timestamp) = $2 
     ORDER BY timestamp`,
    [userId, date]
  );

  // Lógica de validación del flujo
  if (type === 'check_in') {
    if (records.rows.some(r => r.type === 'check_in')) {
      return { valid: false, message: 'Ya registraste tu entrada hoy' };
    }
  } else if (type === 'lunch_out') {
    if (!records.rows.some(r => r.type === 'check_in')) {
      return { valid: false, message: 'Debes registrar tu entrada primero' };
    }
    if (records.rows.some(r => r.type === 'lunch_out')) {
      return { valid: false, message: 'Ya registraste tu salida a comer' };
    }
  } else if (type === 'lunch_in') {
    if (!records.rows.some(r => r.type === 'lunch_out')) {
      return { valid: false, message: 'Debes registrar salida a comer primero' };
    }
  } else if (type === 'check_out') {
    if (!records.rows.some(r => r.type === 'lunch_in') && 
        !records.rows.some(r => r.type === 'check_in')) {
      return { valid: false, message: 'Debes completar la jornada antes de salir' };
    }
  }

  return { valid: true };
}