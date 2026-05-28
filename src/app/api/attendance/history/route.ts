import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const yearStr = searchParams.get('year') || new Date().getFullYear().toString();
    const monthStr = searchParams.get('month') || (new Date().getMonth() + 1).toString();
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const result = await db.query(
      `SELECT 
        id, type, timestamp, notes, is_manual, 
        latitude, longitude, DATE(timestamp::timestamp) as date
       FROM attendance_records 
       WHERE user_id = $1 
       AND EXTRACT(YEAR FROM timestamp::timestamp) = $2 
       AND EXTRACT(MONTH FROM timestamp::timestamp) = $3 
       ORDER BY DATE(timestamp::timestamp) DESC, timestamp ASC`,
      [user.userId, year, month]
    );

    // No modificar el timestamp almacenado (es `text`) — devolver tal cual.
    const normalizedRows = result.rows.map((row: any) => ({
      ...row,
      timestamp: String(row.timestamp),
    }));

    // Agrupar por fecha
    const recordsByDate: Record<string, any> = {};

    normalizedRows.forEach((record: any) => {
      const date = record.date;
      if (!recordsByDate[date]) {
        recordsByDate[date] = {
          date,
          records: [],
          hoursWorked: null,
        };
      }
      recordsByDate[date].records.push(record);
    });

    // Calcular horas trabajadas por día
    const records = Object.values(recordsByDate).map((day: any) => {
      const checkIn = day.records.find((r: any) => r.type === 'check_in');
      const checkOut = day.records.find((r: any) => r.type === 'check_out');

      if (checkIn && checkOut) {
        // Usar parseLocalDate sólo para cálculo de diferencias, sin modificar el string devuelto
        const diff = parseLocalDate(checkOut.timestamp).getTime() - parseLocalDate(checkIn.timestamp).getTime();

        const lunchOut = day.records.find((r: any) => r.type === 'lunch_out');
        const lunchIn = day.records.find((r: any) => r.type === 'lunch_in');

        let lunchTime = 0;
        if (lunchOut && lunchIn) {
          lunchTime = parseLocalDate(lunchIn.timestamp).getTime() - parseLocalDate(lunchOut.timestamp).getTime();
        }

        day.hoursWorked = (diff - lunchTime) / (1000 * 60 * 60);
      }

      return day;
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Nota: no normalizamos el string de timestamp — se devuelve tal cual desde la base de datos.

// Parsea un timestamp SIN zona horaria como hora LOCAL
function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);

  let s = String(dateStr).trim();
  s = s.replace(' ', 'T');
  s = s.split('.')[0].replace(/([+-]\d{2}:?\d{2}|Z)$/, '');

  const [datePart, timePart] = s.split('T');
  const [year, month, day] = (datePart || '').split('-').map(Number);

  if (timePart) {
    const [hours, minutes, seconds] = (timePart || '').split(':').map(Number);
    return new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, seconds || 0);
  }

  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
}