import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];
    const userId = user.userId;

    // Estadísticas del mes actual
    const monthStats = await db.query(
      `SELECT 
        COUNT(DISTINCT DATE(timestamp)) as days_worked,
        COUNT(CASE WHEN type = 'check_in' AND EXTRACT(HOUR FROM timestamp) > 8 
          OR (EXTRACT(HOUR FROM timestamp) = 8 AND EXTRACT(MINUTE FROM timestamp) > 15)
          THEN 1 END) as late_arrivals,
        AVG(CASE WHEN type = 'check_in' 
          THEN EXTRACT(HOUR FROM timestamp) * 60 + EXTRACT(MINUTE FROM timestamp) 
          END) as avg_check_in_minutes,
        AVG(CASE WHEN type = 'check_out' 
          THEN EXTRACT(HOUR FROM timestamp) * 60 + EXTRACT(MINUTE FROM timestamp) 
          END) as avg_check_out_minutes
       FROM attendance_records 
       WHERE user_id = $1 
       AND EXTRACT(MONTH FROM timestamp) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM timestamp) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [userId]
    );

    // Horas trabajadas hoy
    const todayRecords = await db.query(
      `SELECT * FROM attendance_records 
       WHERE user_id = $1 AND DATE(timestamp) = $2 
       ORDER BY timestamp`,
      [userId, today]
    );

    let totalHoursToday = 0;
    const checkIn = todayRecords.rows.find((r: any) => r.type === 'check_in');
    const checkOut = todayRecords.rows.find((r: any) => r.type === 'check_out');

    if (checkIn && checkOut) {
      const diff =
        new Date(checkOut.timestamp).getTime() -
        new Date(checkIn.timestamp).getTime();

      const lunchOut = todayRecords.rows.find((r: any) => r.type === 'lunch_out');
      const lunchIn = todayRecords.rows.find((r: any) => r.type === 'lunch_in');

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
      totalHoursThisMonth: 0, // Se puede calcular si es necesario
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