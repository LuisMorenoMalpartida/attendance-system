import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// ============================================================
// FUNCIONES HELPER
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
    // Si tiene zona (Z o +HH:MM), convertir el instante a hora Perú
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

    // Si no tiene zona, tratar como hora local (naive)
    const naive = String(timestamp).split('.')[0];
    const hasSeconds = /T\d{2}:\d{2}:\d{2}$/.test(naive) || /\d{2}:\d{2}:\d{2}$/.test(naive);
    if (hasSeconds) return naive.replace(' ', 'T');
    const hasMinutes = /T\d{2}:\d{2}$/.test(naive) || /\d{2}:\d{2}$/.test(naive);
    if (hasMinutes) return naive.replace(' ', 'T') + ':00';
    if (/^\d{4}-\d{2}-\d{2}$/.test(naive)) return `${naive}T12:00:00`;
    return naive.replace(' ', 'T');
  } catch {
    return timestamp;
  }
}

/**
 * Parsea un timestamp en formato `YYYY-MM-DDTHH:MM:SS` o con espacio
 * y lo interpreta como hora local (no como UTC).
 */
function parseLocalTimestamp(ts: string): Date {
  const s = ts.replace('T', ' ').split('.')[0];
  const [datePart, timePart] = s.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  if (timePart) {
    const [hour, minute, second] = timePart.split(':').map(Number);
    return new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, second || 0);
  }
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
}

async function validateFlow(userId: number, type: string, date: string) {
  const records = await db.query(
    `SELECT type FROM attendance_records 
     WHERE user_id = $1 AND DATE(timestamp::timestamp) = $2 
     ORDER BY timestamp::timestamp`,
    [userId, date]
  );
  const types = records.rows.map((r: any) => r.type);

  const rules: Record<string, { requires: string[]; blocked: string[]; msg: string }> = {
    check_in:    { requires: [],           blocked: ['check_in'],              msg: 'Ya registraste tu entrada hoy' },
    lunch_out:   { requires: ['check_in'], blocked: ['lunch_out', 'check_out'], msg: 'Debes registrar tu entrada primero' },
    lunch_in:    { requires: ['lunch_out'],blocked: ['lunch_in'],              msg: 'Debes registrar salida a comer primero' },
    check_out:   { requires: ['check_in'], blocked: ['check_out'],             msg: 'Debes registrar tu entrada primero' },
  };

  const rule = rules[type];
  if (!rule) return { valid: false, message: 'Tipo no válido' };

  for (const req of rule.requires) {
    if (!types.includes(req)) return { valid: false, message: rule.msg };
  }
  for (const blk of rule.blocked) {
    if (types.includes(blk)) return { valid: false, message: rule.msg };
  }

  if (type === 'check_out' && types.includes('lunch_out') && !types.includes('lunch_in')) {
    return { valid: false, message: 'Debes registrar tu regreso de comer primero' };
  }

  return { valid: true, message: 'OK' };
}

// ============================================================
// GET - Obtener registros de asistencia
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAuth(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year') || String(new Date().getFullYear());
    const month = searchParams.get('month') || String(new Date().getMonth() + 1);
    const own = searchParams.get('own');

    let query = `
      SELECT 
        ar.id, ar.user_id, u.name as user_name, ar.type, 
        ar.timestamp, ar.notes, ar.is_manual, ar.latitude, ar.longitude,
        DATE(ar.timestamp::timestamp) as date
      FROM attendance_records ar
      JOIN users u ON ar.user_id = u.id
      WHERE EXTRACT(YEAR FROM ar.timestamp::timestamp) = $1
      AND EXTRACT(MONTH FROM ar.timestamp::timestamp) = $2
    `;

    const params: any[] = [year, month];

    if (own === 'true') {
      query += ' AND ar.user_id = $3';
      params.push(admin.userId);
    }

    query += ' ORDER BY DATE(ar.timestamp::timestamp) DESC, ar.timestamp ASC';

    const result = await db.query(query, params);

    // Devolver timestamps crudos desde la BD (para preservar la hora local del dispositivo)
    const normalizedRows = result.rows.map((row: any) => ({
      ...row,
      timestamp: String(row.timestamp),
    }));

    // Agrupar por fecha
    const recordsByDate: Record<string, any> = {};
    for (const record of normalizedRows) {
      const date = record.date;
      if (!recordsByDate[date]) {
        recordsByDate[date] = { date, records: [], hoursWorked: null };
      }
      recordsByDate[date].records.push(record);
    }

    // Calcular horas trabajadas por día
    const records = Object.values(recordsByDate).map((day: any) => {
      const checkIn = day.records.find((r: any) => r.type === 'check_in');
      const checkOut = day.records.find((r: any) => r.type === 'check_out');
      
      if (checkIn && checkOut) {
        const diff = parseLocalTimestamp(checkOut.timestamp).getTime() - parseLocalTimestamp(checkIn.timestamp).getTime();

        const lunchOut = day.records.find((r: any) => r.type === 'lunch_out');
        const lunchIn = day.records.find((r: any) => r.type === 'lunch_in');
        let lunchTime = 0;
        if (lunchOut && lunchIn) {
          lunchTime = parseLocalTimestamp(lunchIn.timestamp).getTime() - parseLocalTimestamp(lunchOut.timestamp).getTime();
        }

        day.hoursWorked = (diff - lunchTime) / (1000 * 60 * 60);
      }
      return day;
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error('❌ Error al obtener registros:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// ============================================================
// POST - Marcar asistencia (admin también marca)
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { type, latitude, longitude, deviceInfo, notes, timestamp } = await req.json();

    // Usar timestamp enviado por el dispositivo si lo hay, sino hora servidor (Perú)
    const localTimestamp = timestamp || getPeruNowTimestamp();
    const today = localTimestamp.split('T')[0];

    console.log('📝 Registrando:', { type, localTimestamp, today });

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

    // Validar flujo
    const valid = await validateFlow(user.userId as number, type, today);
    if (!valid.valid) {
      return NextResponse.json({ error: valid.message }, { status: 400 });
    }

    // Insertar
    const result = await db.query(
      `INSERT INTO attendance_records 
       (user_id, type, timestamp, latitude, longitude, device_info, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [user.userId, type, localTimestamp, latitude, longitude, deviceInfo, notes]
    );

    return NextResponse.json({
      message: 'Registro exitoso',
      record: {
        ...result.rows[0],
        timestamp: String(result.rows[0].timestamp),
      },
    });
  } catch (error) {
    console.error('❌ Error en registro:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}