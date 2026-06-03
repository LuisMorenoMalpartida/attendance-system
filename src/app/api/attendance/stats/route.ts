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
    const admin = await verifyAuth(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const own = searchParams.get('own');
    const today = getPeruToday();

    if (own === 'true') {
      // Estadisticas personales del admin
      const schedules = await db.query(
        `SELECT * FROM work_schedules WHERE user_id = $1 AND is_active = true`,
        [admin.userId]
      );

      const stats = await db.query(`
        SELECT 
          (SELECT COUNT(DISTINCT DATE(timestamp::timestamp)) 
           FROM attendance_records 
           WHERE user_id = $1 
           AND EXTRACT(MONTH FROM timestamp::timestamp) = EXTRACT(MONTH FROM CURRENT_DATE)) as days_worked,
          COALESCE(AVG(CASE WHEN type = 'check_in' THEN EXTRACT(HOUR FROM timestamp::timestamp) + EXTRACT(MINUTE FROM timestamp::timestamp)/60.0 END), 0) as avg_check_in,
          COALESCE(AVG(CASE WHEN type = 'check_out' THEN EXTRACT(HOUR FROM timestamp::timestamp) + EXTRACT(MINUTE FROM timestamp::timestamp)/60.0 END), 0) as avg_check_out,
          COALESCE(SUM(CASE WHEN type = 'check_in' AND DATE(timestamp::timestamp) = $2 THEN 1 ELSE 0 END), 0) as present_today
        FROM attendance_records
        WHERE user_id = $1
      `, [admin.userId, today]);

      // Calcular llegadas tarde personalizadas para el admin
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

      const row = stats.rows[0];

      return NextResponse.json({
        daysWorked: parseInt(row.days_worked) || 0,
        averageCheckIn: row.avg_check_in ? formatHour(row.avg_check_in) : '--:--',
        averageCheckOut: row.avg_check_out ? formatHour(row.avg_check_out) : '--:--',
        totalHoursToday: 0,
        lateArrivals: lateArrivals,
      });
    }

    // Estadisticas globales
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

function formatHour(decimal: number): string {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
} 