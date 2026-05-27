import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// GET - Obtener último registro del día
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || getPeruToday();

    // Obtener el último registro del día
    const lastRecord = await db.query(
      `SELECT * FROM attendance_records 
       WHERE user_id = $1 
       AND DATE(timestamp) = $2 
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [user.userId, date]
    );

    // Obtener todos los registros del día
    const todayRecords = await db.query(
      `SELECT * FROM attendance_records 
       WHERE user_id = $1 
       AND DATE(timestamp) = $2 
       ORDER BY timestamp ASC`,
      [user.userId, date]
    );

    return NextResponse.json({
      lastRecord: lastRecord.rows[0] || null,
      todayRecords: todayRecords.rows,
    });
  } catch (error) {
    console.error('Error al obtener registros:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Registrar asistencia
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { type, latitude, longitude, deviceInfo, notes, timestamp } = await req.json();

    // 👇 Convertir a hora Perú sin timezone
    const localTimestamp = timestamp 
      ? convertToPeruTimestamp(timestamp) 
      : getPeruNowTimestamp();

    const today = localTimestamp.split('T')[0];

    console.log('🕐 Hora original:', timestamp);
    console.log('🕐 Hora Perú guardada:', localTimestamp);

    // Verificar horario laboral
    const schedule = await db.query(
      `SELECT * FROM work_schedules 
       WHERE user_id = $1 AND day_of_week = $2 AND is_active = true`,
      [user.userId, new Date().getDay()]
    );

    // Evitar duplicados consecutivos
    const lastRecord = await db.query(
      `SELECT * FROM attendance_records 
       WHERE user_id = $1 
       AND DATE(timestamp) = $2 
       ORDER BY timestamp DESC LIMIT 1`,
      [user.userId, today]
    );

    if (lastRecord.rows.length > 0 && lastRecord.rows[0].type === type) {
      return NextResponse.json(
        { error: 'No se puede registrar el mismo tipo consecutivamente' },
        { status: 400 }
      );
    }

    // Validar flujo diario
    const validFlow = await validateAttendanceFlow(user.userId as number, type, today);
    if (!validFlow.valid) {
      return NextResponse.json(
        { error: validFlow.message },
        { status: 400 }
      );
    }

    // 👇 Guardar con timestamp sin timezone
    const result = await db.query(
      `INSERT INTO attendance_records 
       (user_id, type, timestamp, latitude, longitude, device_info, notes)
       VALUES ($1, $2, $3::timestamp, $4, $5, $6, $7) 
       RETURNING *`,
      [user.userId, type, localTimestamp, latitude, longitude, deviceInfo, notes]
    );

    return NextResponse.json({
      message: 'Registro exitoso',
      record: result.rows[0],
    });
  } catch (error) {
    console.error('Error en registro de asistencia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función de validación de flujo
async function validateAttendanceFlow(
  userId: number, 
  type: string, 
  date: string
): Promise<{ valid: boolean; message: string }> {
  const records = await db.query(
    `SELECT * FROM attendance_records 
     WHERE user_id = $1 AND DATE(timestamp) = $2 
     ORDER BY timestamp`,
    [userId, date]
  );

  const existingTypes = records.rows.map((r: any) => r.type);

  switch (type) {
    case 'check_in':
      if (existingTypes.includes('check_in')) {
        return { valid: false, message: 'Ya registraste tu entrada hoy' };
      }
      break;

    case 'lunch_out':
      if (!existingTypes.includes('check_in')) {
        return { valid: false, message: 'Debes registrar tu entrada primero' };
      }
      if (existingTypes.includes('lunch_out')) {
        return { valid: false, message: 'Ya registraste tu salida a comer' };
      }
      if (existingTypes.includes('check_out')) {
        return { valid: false, message: 'Ya registraste tu salida del día' };
      }
      break;

    case 'lunch_in':
      if (!existingTypes.includes('lunch_out')) {
        return { valid: false, message: 'Debes registrar salida a comer primero' };
      }
      if (existingTypes.includes('lunch_in')) {
        return { valid: false, message: 'Ya registraste tu regreso de comer' };
      }
      break;

    case 'check_out':
      if (!existingTypes.includes('check_in')) {
        return { valid: false, message: 'Debes registrar tu entrada primero' };
      }
      if (existingTypes.includes('check_out')) {
        return { valid: false, message: 'Ya registraste tu salida hoy' };
      }
      if (existingTypes.includes('lunch_out') && !existingTypes.includes('lunch_in')) {
        return { valid: false, message: 'Debes registrar tu regreso de comer primero' };
      }
      break;

    default:
      return { valid: false, message: 'Tipo de registro no válido' };
  }

  return { valid: true, message: 'OK' };
}

// 👇 Funciones helper para manejo de hora Perú
function getPeruToday(): string {
  const now = new Date();
  const peruString = now.toLocaleString('en-US', { timeZone: 'America/Lima' });
  const peruDate = new Date(peruString);
  const year = peruDate.getFullYear();
  const month = String(peruDate.getMonth() + 1).padStart(2, '0');
  const day = String(peruDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPeruNowTimestamp(): string {
  const now = new Date();
  const peruString = now.toLocaleString('en-US', { timeZone: 'America/Lima' });
  const peruDate = new Date(peruString);
  const year = peruDate.getFullYear();
  const month = String(peruDate.getMonth() + 1).padStart(2, '0');
  const day = String(peruDate.getDate()).padStart(2, '0');
  const hours = String(peruDate.getHours()).padStart(2, '0');
  const minutes = String(peruDate.getMinutes()).padStart(2, '0');
  const seconds = String(peruDate.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function convertToPeruTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const peruString = date.toLocaleString('en-US', { timeZone: 'America/Lima' });
  const peruDate = new Date(peruString);
  const year = peruDate.getFullYear();
  const month = String(peruDate.getMonth() + 1).padStart(2, '0');
  const day = String(peruDate.getDate()).padStart(2, '0');
  const hours = String(peruDate.getHours()).padStart(2, '0');
  const minutes = String(peruDate.getMinutes()).padStart(2, '0');
  const seconds = String(peruDate.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}