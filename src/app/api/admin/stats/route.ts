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

function formatHour(decimal: number): string {
  if (!decimal) return '--:--';
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAuth(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const own = searchParams.get('own');
    const today = getPeruToday();

    if (own === 'true') {
      // ============================================================
      // ESTADISTICAS PERSONALES DEL ADMIN (con horarios personalizados)
      // ============================================================
      const schedules = await db.query(
        `SELECT * FROM work_schedules WHERE user_id = $1 AND is_active = true`,
        [admin.userId]
      );

      // Dias trabajados y promedios
      const monthStats = await db.query(
        `SELECT 
          COUNT(DISTINCT DATE(timestamp::timestamp)) as days_worked,
          AVG(CASE WHEN type = 'check_in' 
            THEN EXTRACT(HOUR FROM timestamp::timestamp) * 60 + EXTRACT(MINUTE FROM timestamp::timestamp) 
            END) as avg_check_in_minutes,
          AVG(CASE WHEN type = 'check_out' 
            THEN EXTRACT(HOUR FROM timestamp::timestamp) * 60 + EXTRACT(MINUTE FROM timestamp::timestamp) 
            END) as avg_check_out_minutes,
          COUNT(CASE WHEN type = 'check_in' AND DATE(timestamp::timestamp) = $2 THEN 1 END) as present_today
         FROM attendance_records 
         WHERE user_id = $1 
         AND EXTRACT(MONTH FROM timestamp::timestamp) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM timestamp::timestamp) = EXTRACT(YEAR FROM CURRENT_DATE)`,
        [admin.userId, today]
      );

      // Calcular llegadas tarde segun horario personalizado
      let lateArrivals = 0;
      const checkIns = await db.query(
        `SELECT timestamp::timestamp as ts, EXTRACT(DOW FROM timestamp::timestamp) as dow
         FROM attendance_records 
         WHERE user_id = $1 AND type = 'check_in'
         AND EXTRACT(MONTH FROM timestamp::timestamp) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM timestamp::timestamp) = EXTRACT(YEAR FROM CURRENT_DATE)`,
        [admin.userId]
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

      // Horas trabajadas hoy
      const todayRecords = await db.query(
        `SELECT * FROM attendance_records 
         WHERE user_id = $1 AND DATE(timestamp::timestamp) = $2 
         ORDER BY timestamp::timestamp`,
        [admin.userId, today]
      );

      let totalHoursToday = 0;
      const checkIn = todayRecords.rows.find((r: any) => r.type === 'check_in');
      const checkOut = todayRecords.rows.find((r: any) => r.type === 'check_out');

      if (checkIn && checkOut) {
        const diff = new Date(checkOut.timestamp).getTime() - new Date(checkIn.timestamp).getTime();
        
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

      const row = monthStats.rows[0];

      return NextResponse.json({
        daysWorkedThisMonth: parseInt(row.days_worked) || 0,
        averageCheckIn: formatHour(row.avg_check_in_minutes / 60),
        averageCheckOut: formatHour(row.avg_check_out_minutes / 60),
        totalHoursThisMonth: 0,
        lateArrivals: lateArrivals,
        lunchTimeAverage: '--:--',
        totalHoursToday: Math.round(totalHoursToday * 100) / 100,
      });
    }

    // ============================================================
    // ESTADISTICAS GLOBALES
    // ============================================================
    const [userStats, attendanceStats, companiesStats] = await Promise.all([
      db.query('SELECT COUNT(*) as total, COUNT(CASE WHEN is_active THEN 1 END) as active FROM users'),
      db.query(`
        SELECT 
          COUNT(DISTINCT CASE WHEN DATE(ar.timestamp::timestamp) = $1 THEN ar.user_id END) as present_today
        FROM attendance_records ar
      `, [today]),
      db.query('SELECT COUNT(*) as total FROM companies'),
    ]);

    // Llegadas tarde globales usando horarios personalizados
    const lateArrivalsQuery = await db.query(`
      SELECT COUNT(DISTINCT ar.user_id) as late_arrivals
      FROM attendance_records ar
      JOIN work_schedules ws ON ar.user_id = ws.user_id 
        AND ws.day_of_week = EXTRACT(DOW FROM ar.timestamp::timestamp)
        AND ws.is_active = true
      WHERE ar.type = 'check_in' 
        AND DATE(ar.timestamp::timestamp) = $1
        AND (
          EXTRACT(HOUR FROM ar.timestamp::timestamp) * 60 + EXTRACT(MINUTE FROM ar.timestamp::timestamp)
          > 
          (EXTRACT(HOUR FROM ws.start_time::time) * 60 + EXTRACT(MINUTE FROM ws.start_time::time) + ws.tolerance_minutes)
        )
    `, [today]);

    const totalUsers = parseInt(userStats.rows[0].total);
    const activeUsers = parseInt(userStats.rows[0].active);
    const presentToday = parseInt(attendanceStats.rows[0].present_today);
    const lateArrivals = parseInt(lateArrivalsQuery.rows[0]?.late_arrivals || '0');

    return NextResponse.json({
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      presentToday,
      absentToday: activeUsers - presentToday,
      lateArrivals,
      averageCheckIn: '--:--',
      averageCheckOut: '--:--',
      totalHoursToday: 0,
      companiesCount: parseInt(companiesStats.rows[0].total),
    });
  } catch (error) {
    console.error('Error al obtener estadisticas:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}