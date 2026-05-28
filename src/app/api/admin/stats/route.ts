import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAuth(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const own = searchParams.get('own');
    const today = new Date().toISOString().split('T')[0];

    if (own === 'true') {
      // Estadísticas personales del admin
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

      const row = stats.rows[0];

      return NextResponse.json({
        daysWorked: parseInt(row.days_worked) || 0,
        averageCheckIn: row.avg_check_in ? formatHour(row.avg_check_in) : '--:--',
        averageCheckOut: row.avg_check_out ? formatHour(row.avg_check_out) : '--:--',
        totalHoursToday: 0,
        lateArrivals: 0,
      });
    }

    // Estadísticas globales
    const [userStats, attendanceStats, companiesStats] = await Promise.all([
      db.query('SELECT COUNT(*) as total, COUNT(CASE WHEN is_active THEN 1 END) as active FROM users'),
      db.query(`
        SELECT 
          COUNT(DISTINCT CASE WHEN DATE(timestamp::timestamp) = $1 THEN user_id END) as present_today,
          COUNT(DISTINCT CASE WHEN type = 'check_in' AND DATE(timestamp::timestamp) = $1 
            AND EXTRACT(HOUR FROM timestamp::timestamp) >= 8 AND EXTRACT(MINUTE FROM timestamp::timestamp) > 15 
            THEN user_id END) as late_arrivals
        FROM attendance_records
      `, [today]),
      db.query('SELECT COUNT(*) as total FROM companies'),
    ]);

    const totalUsers = parseInt(userStats.rows[0].total);
    const activeUsers = parseInt(userStats.rows[0].active);
    const presentToday = parseInt(attendanceStats.rows[0].present_today);
    const lateArrivals = parseInt(attendanceStats.rows[0].late_arrivals);

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
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

function formatHour(decimal: number): string {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}