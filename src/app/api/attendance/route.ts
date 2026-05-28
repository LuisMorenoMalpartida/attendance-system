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
    // Si el timestamp incluye zona (Z o +HH:MM), interpretarlo como instante UTC/offset
    // y convertir al horario de Perú.
    if (timestamp.includes('Z') || timestamp.match(/[+-]\d{2}:?\d{2}/)) {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return timestamp;
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Lima',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }).formatToParts(date);

      const map: Record<string, string> = {};
      for (const p of parts) {
        if (p.type !== 'literal') map[p.type] = p.value;
      }

      const y = map.year;
      const m = map.month;
      const d = map.day;
      const h = map.hour;
      const min = map.minute;
      const s = map.second;
      return `${y}-${m}-${d}T${h}:${min}:${s}`;
    }

    // Si no incluye zona horaria, el valor guardado en la DB es 'naive' (hora local).
    // En ese caso debemos tratar la cadena tal cual como hora local (sin convertirla),
    // para no restar la diferencia UTC-5.
    // Normalizar eliminando posibles milisegundos y zona imaginaria.
    const naive = String(timestamp).split('.')[0];
    // Asegurar que tenga segundos: "YYYY-MM-DDTHH:MM" -> añadir :00
    const hasSeconds = /T\d{2}:\d{2}:\d{2}$/.test(naive);
    if (hasSeconds) return naive;
    const hasMinutes = /T\d{2}:\d{2}$/.test(naive);
    if (hasMinutes) return `${naive}:00`;
    // Si solo fecha
    if (/^\d{4}-\d{2}-\d{2}$/.test(naive)) return `${naive}T12:00:00`;
    return naive;
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

    const last = lastRecord.rows[0] || null;
    const lastRaw = last ? { ...last, timestamp: String(last.timestamp) } : null;

    return NextResponse.json({
      lastRecord: lastRaw,
      todayRecords: todayRecords.rows.map((r: any) => ({
        ...r,
        timestamp: String(r.timestamp),
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

    // 👇 Asegúrate de usar getPeruNowTimestamp() o el timestamp del frontend
    const localTimestamp = timestamp || getPeruNowTimestamp();
    
    console.log('🕐 Guardando timestamp:', localTimestamp);
    // Debería mostrar: 2026-05-27T17:53:33 (hora Perú)

    const today = localTimestamp.split('T')[0];

    // ... validaciones ...

    const result = await db.query(
      `INSERT INTO attendance_records 
       (user_id, type, timestamp, latitude, longitude, device_info, notes)
       VALUES ($1, $2, $3::timestamp, $4, $5, $6, $7) 
       RETURNING *`,
      [user.userId, type, localTimestamp, latitude, longitude, deviceInfo, notes]
    );

    return NextResponse.json({
      message: 'Registro exitoso',
      record: { ...result.rows[0], timestamp: String(result.rows[0].timestamp) },
    });
  } catch (error) {
    console.error('Error en registro:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}