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

function toPeruTime(timestamp: string): Date {
  const date = new Date(timestamp);
  const peruString = date.toLocaleString('en-US', { timeZone: 'America/Lima' });
  return new Date(peruString);
}

function formatPeruTimestamp(timestamp: string): string {
  const peru = toPeruTime(timestamp);
  const y = peru.getFullYear();
  const m = String(peru.getMonth() + 1).padStart(2, '0');
  const d = String(peru.getDate()).padStart(2, '0');
  const h = String(peru.getHours()).padStart(2, '0');
  const min = String(peru.getMinutes()).padStart(2, '0');
  const s = String(peru.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}:${s}`;
}

async function validateFlow(userId: number, type: string, date: string) {
  const records = await db.query(
    `SELECT type FROM attendance_records 
     WHERE user_id = $1 AND DATE(timestamp) = $2 
     ORDER BY timestamp`,
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
        DATE(ar.timestamp) as date
      FROM attendance_records ar
      JOIN users u ON ar.user_id = u.id
      WHERE EXTRACT(YEAR FROM ar.timestamp) = $1
      AND EXTRACT(MONTH FROM ar.timestamp) = $2
    `;

    const params: any[] = [year, month];

    if (own === 'true') {
      query += ' AND ar.user_id = $3';
      params.push(admin.userId);
    }

    query += ' ORDER BY DATE(ar.timestamp) DESC, ar.timestamp ASC';

    const result = await db.query(query, params);

    // 👇 Normalizar timestamps a hora Perú
    const normalizedRows = result.rows.map((row: any) => ({
      ...row,
      timestamp: formatPeruTimestamp(row.timestamp),
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
        const diff = new Date(checkOut.timestamp).getTime() - new Date(checkIn.timestamp).getTime();
        
        const lunchOut = day.records.find((r: any) => r.type === 'lunch_out');
        const lunchIn = day.records.find((r: any) => r.type === 'lunch_in');
        let lunchTime = 0;
        if (lunchOut && lunchIn) {
          lunchTime = new Date(lunchIn.timestamp).getTime() - new Date(lunchOut.timestamp).getTime();
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

    // Timestamp en hora Perú
    const localTimestamp = timestamp ? formatPeruTimestamp(timestamp) : getPeruNowTimestamp();
    const today = localTimestamp.split('T')[0];

    console.log('📝 Registrando:', { type, localTimestamp, today });

    // Evitar duplicados consecutivos
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