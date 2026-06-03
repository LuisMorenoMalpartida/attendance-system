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

    // Obtener parametros de mes/año (si no vienen, usar mes actual)
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

    const today = getPeruToday();
    const userId = user.userId;

    console.log('Stats - Año:', year, 'Mes:', month, 'User:', userId);

    // Obtener horarios del usuario
    const schedules = await db.query(
      `SELECT * FROM work_schedules WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    // Dias trabajados y promedios del mes seleccionado
    const monthStats = await db.query(
      `SELECT 
        COUNT(DISTINCT DATE(timestamp::timestamp)) as days_worked,
        AVG(CASE WHEN type = 'check_in' 
          THEN EXTRACT(HOUR FROM timestamp::timestamp) * 60 + EXTRACT(MINUTE FROM timestamp::timestamp) 
          END) as avg_check_in_minutes,
        AVG(CASE WHEN type = 'check_out' 
          THEN EXTRACT(HOUR FROM timestamp::timestamp) * 60 + EXTRACT(MINUTE FROM timestamp::timestamp) 
          END) as avg_check_out_minutes
       FROM attendance_records 
       WHERE user_id = $1 
       AND EXTRACT(MONTH FROM timestamp::timestamp) = $2
       AND EXTRACT(YEAR FROM timestamp::timestamp) = $3`,
      [userId, month, year]
    );

    // Calcular llegadas tarde del mes seleccionado segun horario personalizado
    let lateArrivals = 0;
    const checkIns = await db.query(
      `SELECT timestamp::timestamp as ts, EXTRACT(DOW FROM timestamp::timestamp) as dow
       FROM attendance_records 
       WHERE user_id = $1 AND type = 'check_in'
       AND EXTRACT(MONTH FROM timestamp::timestamp) = $2
       AND EXTRACT(YEAR FROM timestamp::timestamp) = $3`,
      [userId, month, year]
    );

    for (const record of checkIns.rows) {
      const dayOfWeek = record.dow;
      const schedule = schedules.rows.find((s: any) => s.day_of_week === dayOfWeek);
      
      if (schedule) {
        const checkInTime = new Date(record.ts);
        const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
        
        const startParts = schedule.start_time.split(':');
        const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
        const toleranceMinutes = schedule.tolerance_minutes || 15;
        
        if (checkInMinutes > startMinutes + toleranceMinutes) {
          lateArrivals++;
        }
      }
    }

    // Horas trabajadas del mes (suma de todas las horas)
    let totalHoursThisMonth = 0;
    const allMonthRecords = await db.query(
      `SELECT * FROM attendance_records 
       WHERE user_id = $1 
       AND EXTRACT(MONTH FROM timestamp::timestamp) = $2
       AND EXTRACT(YEAR FROM timestamp::timestamp) = $3
       ORDER BY DATE(timestamp::timestamp), timestamp::timestamp`,
      [userId, month, year]
    );

    // Agrupar por dia para calcular horas
    const recordsByDate: Record<string, any[]> = {};
    for (const record of allMonthRecords.rows) {
      const dateKey = new Date(record.timestamp).toISOString().split('T')[0];
      if (!recordsByDate[dateKey]) recordsByDate[dateKey] = [];
      recordsByDate[dateKey].push(record);
    }

    for (const [dateKey, dayRecords] of Object.entries(recordsByDate)) {
      const checkIn = dayRecords.find((r: any) => r.type === 'check_in');
      const checkOut = dayRecords.find((r: any) => r.type === 'check_out');
      
      if (checkIn && checkOut) {
        const diff = new Date(checkOut.timestamp).getTime() - new Date(checkIn.timestamp).getTime();
        
        const dayOfWeek = new Date(dateKey + 'T12:00:00').getDay();
        const daySchedule = schedules.rows.find((s: any) => s.day_of_week === dayOfWeek);
        
        let lunchTime = 0;
        if (daySchedule) {
          const startHour = parseInt(daySchedule.start_time.split(':')[0]);
          const endHour = parseInt(daySchedule.end_time.split(':')[0]);
          if (endHour - startHour > 5) {
            const lunchOut = dayRecords.find((r: any) => r.type === 'lunch_out');
            const lunchIn = dayRecords.find((r: any) => r.type === 'lunch_in');
            if (lunchOut && lunchIn) {
              lunchTime = new Date(lunchIn.timestamp).getTime() - new Date(lunchOut.timestamp).getTime();
            }
          }
        }

        totalHoursThisMonth += (diff - lunchTime) / (1000 * 60 * 60);
      }
    }

    // Horas trabajadas hoy (siempre del dia actual)
    const todayRecords = await db.query(
      `SELECT * FROM attendance_records 
       WHERE user_id = $1 AND DATE(timestamp::timestamp) = $2 
       ORDER BY timestamp::timestamp`,
      [userId, today]
    );

    let totalHoursToday = 0;
    const todayCheckIn = todayRecords.rows.find((r: any) => r.type === 'check_in');
    const todayCheckOut = todayRecords.rows.find((r: any) => r.type === 'check_out');

    if (todayCheckIn && todayCheckOut) {
      const diff = new Date(todayCheckOut.timestamp).getTime() - new Date(todayCheckIn.timestamp).getTime();
      
      const dayOfWeek = new Date(today + 'T12:00:00').getDay();
      const todaySchedule = schedules.rows.find((s: any) => s.day_of_week === dayOfWeek);
      
      let lunchTime = 0;
      if (todaySchedule) {
        const startHour = parseInt(todaySchedule.start_time.split(':')[0]);
        const endHour = parseInt(todaySchedule.end_time.split(':')[0]);
        if (endHour - startHour > 5) {
          const lunchOut = todayRecords.rows.find((r: any) => r.type === 'lunch_out');
          const lunchIn = todayRecords.rows.find((r: any) => r.type === 'lunch_in');
          if (lunchOut && lunchIn) {
            lunchTime = new Date(lunchIn.timestamp).getTime() - new Date(lunchOut.timestamp).getTime();
          }
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
      totalHoursThisMonth: Math.round(totalHoursThisMonth * 100) / 100,
      lateArrivals: lateArrivals,
      lunchTimeAverage: '--:--',
      totalHoursToday: Math.round(totalHoursToday * 100) / 100,
    });
  } catch (error) {
    console.error('Error al obtener estadisticas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}