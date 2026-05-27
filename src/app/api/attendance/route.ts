import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// ============================================================
// HELPERS
// ============================================================
function getPeruNowTimestamp(): string {
  const now = new Date();
  const peruString = now.toLocaleString('en-US', { timeZone: 'America/Lima' });
  const peruDate = new Date(peruString);
  const y = peruDate.getFullYear();
  const m = String(peruDate.getMonth() + 1).padStart(2, '0');
  const d = String(peruDate.getDate()).padStart(2, '0');
  const h = String(peruDate.getHours()).padStart(2, '0');
  const min = String(peruDate.getMinutes()).padStart(2, '0');
  const s = String(peruDate.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}:${s}`;
}

function formatPeruTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp;
    const peruString = date.toLocaleString('en-US', { timeZone: 'America/Lima' });
    const peruDate = new Date(peruString);
    const y = peruDate.getFullYear();
    const m = String(peruDate.getMonth() + 1).padStart(2, '0');
    const d = String(peruDate.getDate()).padStart(2, '0');
    const h = String(peruDate.getHours()).padStart(2, '0');
    const min = String(peruDate.getMinutes()).padStart(2, '0');
    const s = String(peruDate.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}:${s}`;
  } catch {
    return timestamp;
  }
}

function getPeruToday(): string {
  return getPeruNowTimestamp().split('T')[0];
}

async function validateFlow(userId: number, type: string, date: string) {
  const records = await db.query(
    `SELECT type FROM attendance_records 
     WHERE user_id = $1 AND DATE(timestamp) = $2 
     ORDER BY timestamp`,
    [userId, date]
  );
  const types = records.rows.map((r: any) => r.type);

  switch (type) {
    case 'check_in':
      if (types.includes('check_in')) return { valid: false, message: 'Ya registraste tu entrada hoy' };
      break;
    case 'lunch_out':
      if (!types.includes('check_in')) return { valid: false, message: 'Debes registrar tu entrada primero' };
      if (types.includes('lunch_out')) return { valid: false, message: 'Ya registraste tu salida a comer' };
      if (types.includes('check_out')) return { valid: false, message: 'Ya registraste tu salida del día' };
      break;
    case 'lunch_in':
      if (!types.includes('lunch_out')) return { valid: false, message: 'Debes registrar salida a comer primero' };
      if (types.includes('lunch_in')) return { valid: false, message: 'Ya registraste tu regreso de comer' };
      break;
    case 'check_out':
      if (!types.includes('check_in')) return { valid: false, message: 'Debes registrar tu entrada primero' };
      if (types.includes('check_out')) return { valid: false, message: 'Ya registraste tu salida hoy' };
      if (types.includes('lunch_out') && !types.includes('lunch_in')) return { valid: false, message: 'Debes registrar tu regreso de comer primero' };
      break;
    default:
      return { valid: false, message: 'Tipo de registro no válido' };
  }
  return { valid: true, message: 'OK' };
}

// ============================================================
// GET - Obtener registros del día
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || getPeruToday();

    const lastRecord = await db.query(
      `SELECT * FROM attendance_records 
       WHERE user_id = $1 AND DATE(timestamp) = $2 
       ORDER BY timestamp DESC LIMIT 1`,
      [user.userId, date]
    );

    const todayRecords = await db.query(
      `SELECT * FROM attendance_records 
       WHERE user_id = $1 AND DATE(timestamp) = $2 
       ORDER BY timestamp ASC`,
      [user.userId, date]
    );

    return NextResponse.json({
      lastRecord: lastRecord.rows[0] || null,
      todayRecords: todayRecords.rows.map((r: any) => ({
        ...r,
        timestamp: formatPeruTimestamp(r.timestamp),
      })),
    });
  } catch (error) {
    console.error('Error al obtener registros:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// ============================================================
// POST - Marcar asistencia
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { type, latitude, longitude, deviceInfo, notes, timestamp } = await req.json();

    const localTimestamp = timestamp ? formatPeruTimestamp(timestamp) : getPeruNowTimestamp();
    const today = localTimestamp.split('T')[0];

    console.log('📝 Registro:', { type, localTimestamp, userId: user.userId });

    // Evitar duplicados
    const lastRecord = await db.query(
      `SELECT * FROM attendance_records 
       WHERE user_id = $1 AND DATE(timestamp) = $2 
       ORDER BY timestamp DESC LIMIT 1`,
      [user.userId, today]
    );

    if (lastRecord.rows.length > 0 && lastRecord.rows[0].type === type) {
      return NextResponse.json(
        { error: 'No se puede registrar el mismo tipo consecutivamente' },
        { status: 400 }
      );
    }

    // Validar flujo
    const valid = await validateFlow(user.userId as number, type, today);
    if (!valid.valid) {
      return NextResponse.json({ error: valid.message }, { status: 400 });
    }

    // Insertar
    const result = await db.query(
      `INSERT INTO attendance_records 
       (user_id, type, timestamp, latitude, longitude, device_info, notes)
       VALUES ($1, $2, $3::timestamp, $4, $5, $6, $7) 
       RETURNING *`,
      [user.userId, type, localTimestamp, latitude, longitude, deviceInfo, notes]
    );

    return NextResponse.json({
      message: 'Registro exitoso',
      record: {
        ...result.rows[0],
        timestamp: formatPeruTimestamp(result.rows[0].timestamp),
      },
    });
  } catch (error) {
    console.error('❌ Error en registro:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}