import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// Obtener fecha de hoy en hora Perú
function getPeruToday(): string {
  const now = new Date();
  const peruString = now.toLocaleString('en-US', { timeZone: 'America/Lima' });
  const peruDate = new Date(peruString);
  const year = peruDate.getFullYear();
  const month = String(peruDate.getMonth() + 1).padStart(2, '0');
  const day = String(peruDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Normalizar timestamp a hora Perú
function normalizeTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp;
    
    const peruString = date.toLocaleString('en-US', { timeZone: 'America/Lima' });
    const peruDate = new Date(peruString);
    
    const year = peruDate.getFullYear();
    const month = String(peruDate.getMonth() + 1).padStart(2, '0');
    const day = String(peruDate.getDate()).padStart(2, '0');
    const hours = String(peruDate.getHours()).padStart(2, '0');
    const minutes = String(peruDate.getMinutes()).padStart(2, '0');
    const seconds = String(peruDate.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  } catch {
    return timestamp;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Usar hora Perú
    const today = getPeruToday();
    const userId = user.userId;

    console.log('📊 Stats - Hoy Perú:', today);

    // Estadísticas del mes actual
    const monthStats = await db.query(
      `SELECT 
        COUNT(DISTINCT DATE(timestamp::timestamp)) as days_worked,
        COUNT(CASE WHEN type = 'check_in' AND (
          EXTRACT(HOUR FROM timestamp::timestamp) > 8 
          OR (EXTRACT(HOUR FROM timestamp::timestamp) = 8 AND EXTRACT(MINUTE FROM timestamp::timestamp) > 15)
        ) THEN 1 END) as late_arrivals,
        AVG(CASE WHEN type = 'check_in' 
          THEN EXTRACT(HOUR FROM timestamp::timestamp) * 60 + EXTRACT(MINUTE FROM timestamp::timestamp) 
          END) as avg_check_in_minutes,
        AVG(CASE WHEN type = 'check_out' 
          THEN EXTRACT(HOUR FROM timestamp::timestamp) * 60 + EXTRACT(MINUTE FROM timestamp::timestamp) 
          END) as avg_check_out_minutes
       FROM attendance_records 
       WHERE user_id = $1 
       AND EXTRACT(MONTH FROM timestamp::timestamp) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM timestamp::timestamp) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [userId]
    );

    // Horas trabajadas hoy
    const todayRecords = await db.query(
      `SELECT * FROM attendance_records 
       WHERE user_id = $1 AND DATE(timestamp::timestamp) = $2 
       ORDER BY timestamp::timestamp`,
      [userId, today]
    );

    // Normalizar timestamps antes de calcular
    const normalizedRecords = todayRecords.rows.map((r: any) => ({
      ...r,
      timestamp: normalizeTimestamp(r.timestamp),
    }));

    let totalHoursToday = 0;
    const checkIn = normalizedRecords.find((r: any) => r.type === 'check_in');
    const checkOut = normalizedRecords.find((r: any) => r.type === 'check_out');

    if (checkIn && checkOut) {
      const diff =
        new Date(checkOut.timestamp).getTime() -
        new Date(checkIn.timestamp).getTime();

      const lunchOut = normalizedRecords.find((r: any) => r.type === 'lunch_out');
      const lunchIn = normalizedRecords.find((r: any) => r.type === 'lunch_in');

      let lunchTime = 0;
      if (lunchOut && lunchIn) {
        lunchTime =
          new Date(lunchIn.timestamp).getTime() -
          new Date(lunchOut.timestamp).getTime();
      }

      totalHoursToday = (diff - lunchTime) / (1000 * 60 * 60);
    }

    // Formatear promedios
    const formatMinutes = (minutes: number | null): string => {
      if (!minutes) return '--:--';
      const h = Math.floor(minutes / 60);
      const m = Math.round(minutes % 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const row = monthStats.rows[0];

    return NextResponse.json({
      daysWorkedThisMonth: parseInt(row.days_worked) || 0,
      averageCheckIn: formatMinutes(row.avg_check_in_minutes),
      averageCheckOut: formatMinutes(row.avg_check_out_minutes),
      totalHoursThisMonth: 0,
      lateArrivals: parseInt(row.late_arrivals) || 0,
      lunchTimeAverage: '--:--',
      totalHoursToday: Math.round(totalHoursToday * 100) / 100,
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}