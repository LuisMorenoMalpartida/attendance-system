import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'daily';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    let query = '';
    let params: any[] = [];

    switch (period) {
      case 'daily':
        query = `
          SELECT 
            u.id, u.name, u.company_id,
            COUNT(CASE WHEN ar.type = 'check_in' THEN 1 END) as check_ins,
            COUNT(CASE WHEN ar.type = 'check_out' THEN 1 END) as check_outs,
            MIN(CASE WHEN ar.type = 'check_in' THEN ar.timestamp END) as first_check_in,
            MAX(CASE WHEN ar.type = 'check_out' THEN ar.timestamp END) as last_check_out,
            COUNT(DISTINCT CASE WHEN ar.type = 'check_in' THEN DATE(ar.timestamp::timestamp) END) as days_attended,
            COALESCE(
              EXTRACT(EPOCH FROM 
                (
                  MAX(CASE WHEN ar.type = 'check_out' THEN ar.timestamp END)::timestamp - 
                  MIN(CASE WHEN ar.type = 'check_in' THEN ar.timestamp END)::timestamp
                )
              ) / 3600, 0
            ) as hours_worked
          FROM users u
          LEFT JOIN attendance_records ar ON u.id = ar.user_id
            AND DATE(ar.timestamp::timestamp) = $1
          WHERE u.is_active = true
        `;
        params = [startDate || new Date().toISOString().split('T')[0]];
        break;
      // ... otros períodos
    }

    if (userId) {
      query += ' AND u.id = $' + (params.length + 1);
      params.push(userId);
    }

    query += ' GROUP BY u.id, u.name, u.company_id ORDER BY u.name';

    const result = await db.query(query, params);

    // Calcular métricas adicionales
    const metrics = {
      total_employees: result.rows.length,
      present_today: result.rows.filter(r => r.check_ins > 0).length,
      absent_today: result.rows.filter(r => r.check_ins === 0).length,
      average_check_in: calculateAverageCheckIn(result.rows),
      late_arrivals: countLateArrivals(result.rows)
    };

    return NextResponse.json({
      records: result.rows,
      metrics
    });
  } catch (error) {
    console.error('Error en reportes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

function calculateAverageCheckIn(rows: any[]) {
  const validCheckIns = rows
    .map((r) => r.first_check_in)
    .filter(Boolean);

  if (validCheckIns.length === 0) {
    return null;
  }

  const totalMinutes = validCheckIns.reduce((acc, timestamp) => {
    const date = new Date(timestamp);

    return acc + date.getHours() * 60 + date.getMinutes();
  }, 0);

  const averageMinutes = Math.floor(
    totalMinutes / validCheckIns.length
  );

  const hours = Math.floor(averageMinutes / 60)
    .toString()
    .padStart(2, '0');

  const minutes = (averageMinutes % 60)
    .toString()
    .padStart(2, '0');

  return `${hours}:${minutes}`;
}

function countLateArrivals(rows: any[]) {
  const LATE_HOUR = 9;

  return rows.filter((r) => {
    if (!r.first_check_in) {
      return false;
    }

    const checkIn = new Date(r.first_check_in);

    return checkIn.getHours() >= LATE_HOUR;
  }).length;
}