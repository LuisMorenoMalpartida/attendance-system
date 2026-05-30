import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

function getPeruToday(): string {
  const now = new Date();
  const peruString = now.toLocaleString('en-US', { timeZone: 'America/Lima' });
  const peruDate = new Date(peruString);
  const y = peruDate.getFullYear();
  const m = String(peruDate.getMonth() + 1).padStart(2, '0');
  const d = String(peruDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const today = getPeruToday();
    const userId = user.userId;

    console.log('Stats - Hoy Perú:', today);

    // Estadísticas del mes actual con soporte para sábados
    const monthStats = await db.query(
      `SELECT 
        COUNT(DISTINCT DATE(timestamp::timestamp)) as days_worked,
        COUNT(CASE 
          -- Sábados (DOW=6): tarde después de 09:15
          WHEN type = 'check_in' AND EXTRACT(DOW FROM timestamp::timestamp) = 6 
            AND (EXTRACT(HOUR FROM timestamp::timestamp) > 9 
              OR (EXTRACT(HOUR FROM timestamp::timestamp) = 9 AND EXTRACT(MINUTE FROM timestamp::timestamp) > 15))
          THEN 1
          -- Lunes a Viernes (DOW=1-5): tarde después de 08:15
          WHEN type = 'check_in' AND EXTRACT(DOW FROM timestamp::timestamp) IN (1,2,3,4,5)
            AND (EXTRACT(HOUR FROM timestamp::timestamp) > 8 
              OR (EXTRACT(HOUR FROM timestamp::timestamp) = 8 AND EXTRACT(MINUTE FROM timestamp::timestamp) > 15))
          THEN 1
        END) as late_arrivals,
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

    let totalHoursToday = 0;
    const checkIn = todayRecords.rows.find((r: any) => r.type === 'check_in');
    const checkOut = todayRecords.rows.find((r: any) => r.type === 'check_out');

    if (checkIn && checkOut) {
      const diff = new Date(checkOut.timestamp).getTime() - new Date(checkIn.timestamp).getTime();
      
      // Solo restar comida si es día de semana (lun-vie)
      const dayOfWeek = new Date(today + 'T12:00:00').getDay();
      let lunchTime = 0;
      
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const lunchOut = todayRecords.rows.find((r: any) => r.type === 'lunch_out');
        const lunchIn = todayRecords.rows.find((r: any) => r.type === 'lunch_in');
        
        if (lunchOut && lunchIn) {
          lunchTime = new Date(lunchIn.timestamp).getTime() - new Date(lunchOut.timestamp).getTime();
        }
      }

      totalHoursToday = (diff - lunchTime) / (1000 * 60 * 60);
    }

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