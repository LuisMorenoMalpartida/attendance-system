import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { publishEvent } from '@/lib/sse';
import { parseLocalDate } from '@/lib/date-utils';

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

      return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`;
    }

    const naive = String(timestamp).split('.')[0];
    const hasSeconds = /T\d{2}:\d{2}:\d{2}$/.test(naive);
    if (hasSeconds) return naive;
    const hasMinutes = /T\d{2}:\d{2}$/.test(naive);
    if (hasMinutes) return `${naive}:00`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(naive)) return `${naive}T12:00:00`;
    return naive;
  } catch {
    return timestamp;
  }
}

function getPeruToday(): string {
  return getPeruNowTimestamp().split('T')[0];
}

// ============================================================
// VALIDACION DE FLUJO CON SOPORTE PARA HORARIOS PERSONALIZADOS
// ============================================================
async function validateFlow(userId: number, type: string, date: string, timestamp?: string) {
  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  
  // Obtener horario del usuario para este dia
  const schedule = await db.query(
    `SELECT * FROM work_schedules 
     WHERE user_id = $1 AND day_of_week = $2 AND is_active = true`,
    [userId, dayOfWeek]
  );

  // Si no tiene horario para este dia, no puede marcar
  if (schedule.rows.length === 0) {
    return { valid: false, message: 'No tienes horario laboral para este dia' };
  }

  const scheduleData = schedule.rows[0];
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;

  if (isSunday) {
    return { valid: false, message: 'Domingo no es dia laborable' };
  }

  const records = await db.query(
    `SELECT type FROM attendance_records 
     WHERE user_id = $1 AND DATE(timestamp::timestamp) = $2 
     ORDER BY timestamp::timestamp`,
    [userId, date]
  );
  const types = records.rows.map((r: any) => r.type);

  // Sabado: solo entrada y salida (sin comida)
  if (isSaturday) {
    switch (type) {
      case 'check_in':
        if (types.includes('check_in')) {
          return { valid: false, message: 'Ya registraste tu entrada hoy' };
        }
        break;
      case 'check_out':
        if (!types.includes('check_in')) {
          return { valid: false, message: 'Debes registrar tu entrada primero' };
        }
        if (types.includes('check_out')) {
          return { valid: false, message: 'Ya registraste tu salida hoy' };
        }
        break;
      case 'lunch_out':
      case 'lunch_in':
        return { valid: false, message: 'Los sabados no tienen horario de comida' };
      default:
        return { valid: false, message: 'Tipo de registro no valido' };
    }
    return { valid: true, message: 'OK' };
  }

  // Lunes a Viernes: verificar si el horario incluye comida
  const startTime = scheduleData.start_time;
  const endTime = scheduleData.end_time;
  
  // Calcular horas trabajadas para determinar si hay comida
  const startHour = parseInt(startTime.split(':')[0]);
  const endHour = parseInt(endTime.split(':')[0]);
  const hoursWorked = endHour - startHour;
  const hasLunchBreak = hoursWorked > 5; // Si trabaja mas de 5 horas, tiene comida

  // Si no tiene comida, bloquear lunch_out y lunch_in
  if (!hasLunchBreak && (type === 'lunch_out' || type === 'lunch_in')) {
    return { valid: false, message: 'Tu horario no incluye tiempo de comida' };
  }

  switch (type) {
    case 'check_in':
      if (types.includes('check_in')) {
        return { valid: false, message: 'Ya registraste tu entrada hoy' };
      }
      break;
    case 'lunch_out':
      if (!types.includes('check_in')) {
        return { valid: false, message: 'Debes registrar tu entrada primero' };
      }
      if (types.includes('lunch_out')) {
        return { valid: false, message: 'Ya registraste tu salida a comer' };
      }
      if (types.includes('check_out')) {
        return { valid: false, message: 'Ya registraste tu salida del dia' };
      }
      break;
    case 'lunch_in':
      if (!types.includes('lunch_out')) {
        return { valid: false, message: 'Debes registrar salida a comer primero' };
      }
      if (types.includes('lunch_in')) {
        return { valid: false, message: 'Ya registraste tu regreso de comer' };
      }
      break;
    case 'check_out':
      if (!types.includes('check_in')) {
        return { valid: false, message: 'Debes registrar tu entrada primero' };
      }
      if (types.includes('check_out')) {
        return { valid: false, message: 'Ya registraste tu salida hoy' };
      }
      if (hasLunchBreak && types.includes('lunch_out') && !types.includes('lunch_in')) {
        return { valid: false, message: 'Debes registrar tu regreso de comer primero' };
      }
      break;
    case 'active_break_start': {
      const breakStarts = types.filter((t: string) => t === 'active_break_start').length;
      const breakEnds = types.filter((t: string) => t === 'active_break_end').length;
      if (breakStarts >= 2) {
        return { valid: false, message: 'Ya alcanzaste el maximo de 2 pausas por dia' };
      }
      if (breakStarts > breakEnds) {
        return { valid: false, message: 'Ya tienes una pausa activa' };
      }
      break;
    }
    case 'active_break_end': {
      const breakStarts = types.filter((t: string) => t === 'active_break_start').length;
      const breakEnds = types.filter((t: string) => t === 'active_break_end').length;
      if (breakStarts <= breakEnds) {
        return { valid: false, message: 'No has iniciado una pausa' };
      }
      break;
    }
    case 'bathroom_start': {
      const openBathStart = types.filter((t: string) => t === 'bathroom_start').length;
      const openBathEnd = types.filter((t: string) => t === 'bathroom_end').length;
      if (openBathStart > openBathEnd) {
        return { valid: false, message: 'Ya tienes una salida al baño en curso' };
      }
      break;
    }
    case 'bathroom_end': {
      const starts = records.rows.filter((r: any) => r.type === 'bathroom_start');
      const ends = records.rows.filter((r: any) => r.type === 'bathroom_end');
      if (starts.length <= ends.length) {
        return { valid: false, message: 'No has iniciado una salida al baño' };
      }
      const lastStart = starts[starts.length - 1];
      const startTime = new Date(lastStart.timestamp).getTime();
      const endTime = new Date(timestamp || getPeruNowTimestamp()).getTime();
      const minutes = Math.round((endTime - startTime) / 60000);
      if (minutes > 5) {
        return { valid: false, message: `La salida al baño no puede exceder 5 minutos (${minutes} min)` };
      }
      break;
    }
    default:
      return { valid: false, message: 'Tipo de registro no valido' };
  }
  return { valid: true, message: 'OK' };
}

// ============================================================
// GET - Obtener registros del dia
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
       WHERE user_id = $1 AND DATE(timestamp::timestamp) = $2 
       ORDER BY timestamp::timestamp DESC LIMIT 1`,
      [user.userId, date]
    );

    const todayRecords = await db.query(
      `SELECT * FROM attendance_records 
       WHERE user_id = $1 AND DATE(timestamp::timestamp) = $2 
       ORDER BY timestamp::timestamp ASC`,
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

    const localTimestamp = timestamp || getPeruNowTimestamp();
    const today = localTimestamp.split('T')[0];

    console.log('Registrando:', { type, localTimestamp, today, userId: user.userId });

    // Evitar duplicados consecutivos
    const lastRecord = await db.query(
      `SELECT * FROM attendance_records 
       WHERE user_id = $1 AND DATE(timestamp::timestamp) = $2 
       ORDER BY timestamp::timestamp DESC LIMIT 1`,
      [user.userId, today]
    );

    if (lastRecord.rows.length > 0 && lastRecord.rows[0].type === type) {
      return NextResponse.json(
        { error: 'No se puede registrar el mismo tipo consecutivamente' },
        { status: 400 }
      );
    }

    // Auto-cerrar pausa activa si excede 10 minutos
    if (type !== 'active_break_end') {
      const openBreak = await db.query(
        `SELECT timestamp FROM attendance_records 
         WHERE user_id = $1 AND type = 'active_break_start' AND DATE(timestamp::timestamp) = $2 
         AND NOT EXISTS (
           SELECT 1 FROM attendance_records ar2 
           WHERE ar2.user_id = $1 AND ar2.type = 'active_break_end' 
           AND DATE(ar2.timestamp::timestamp) = DATE(attendance_records.timestamp::timestamp)
           AND ar2.timestamp > attendance_records.timestamp
         )
         ORDER BY timestamp DESC LIMIT 1`,
        [user.userId, today]
      );

      if (openBreak.rows.length > 0) {
        const breakStart = parseLocalDate(openBreak.rows[0].timestamp);
        const now = parseLocalDate(localTimestamp);
        const minutesDiff = (now.getTime() - breakStart.getTime()) / 60000;

        if (minutesDiff > 10) {
          const autoEnd = new Date(breakStart.getTime() + 10 * 60 * 1000);
          const autoEndTs = `${autoEnd.getFullYear()}-${String(autoEnd.getMonth() + 1).padStart(2, '0')}-${String(autoEnd.getDate()).padStart(2, '0')} ${String(autoEnd.getHours()).padStart(2, '0')}:${String(autoEnd.getMinutes()).padStart(2, '0')}:${String(autoEnd.getSeconds()).padStart(2, '0')}`;
          await db.query(
            `INSERT INTO attendance_records (user_id, type, timestamp) VALUES ($1, 'active_break_end', $2)`,
            [user.userId, autoEndTs]
          );
        }
      }
    }

    // Validar flujo diario (incluye validacion de sabados y horarios personalizados)
    const validFlow = await validateFlow(user.userId as number, type, today, localTimestamp);
    if (!validFlow.valid) {
      return NextResponse.json(
        { error: validFlow.message },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO attendance_records 
       (user_id, type, timestamp, latitude, longitude, device_info, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [user.userId, type, localTimestamp, latitude, longitude, deviceInfo, notes]
    );

    // Emit SSE event to connected clients
    try {
      const rec = { ...result.rows[0], timestamp: String(result.rows[0].timestamp) };
      publishEvent('attendance', { userId: user.userId, record: rec });
    } catch (e) {
      console.warn('SSE publish failed', e);
    }

    return NextResponse.json({
      message: 'Registro exitoso',
      record: { ...result.rows[0], timestamp: String(result.rows[0].timestamp) },
    });
  } catch (error) {
    console.error('Error en registro:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}