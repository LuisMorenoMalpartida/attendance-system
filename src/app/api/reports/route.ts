import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getPeruToday, toPeruTimestamp, calculateBreakTime } from '@/lib/date-utils';
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
      case 'daily': {
        const targetDate = startDate || getPeruToday();
        query = `
          SELECT 
            u.id, u.name, u.company_id,
            ar.type, ar.timestamp
          FROM users u
          LEFT JOIN attendance_records ar ON u.id = ar.user_id
            AND DATE(ar.timestamp::timestamp) = $1
          WHERE u.is_active = true
        `;
        params = [targetDate];
        break;
      }
      // ... otros períodos
    }

    if (userId) {
      query += ' AND u.id = $' + (params.length + 1);
      params.push(userId);
    }

    query += ' ORDER BY u.name, ar.timestamp ASC';

    const result = await db.query(query, params);

    // Agrupar por usuario y calcular horas
    const recordsByUser: Record<string, any> = {};
    for (const record of result.rows) {
      if (!recordsByUser[record.id]) {
        recordsByUser[record.id] = {
          id: record.id,
          name: record.name,
          company_id: record.company_id,
          check_ins: 0,
          check_outs: 0,
          records: [],
        };
      }
      if (record.type) {
        recordsByUser[record.id].records.push(record);
        if (record.type === 'check_in') recordsByUser[record.id].check_ins++;
        if (record.type === 'check_out') recordsByUser[record.id].check_outs++;
      }
    }

    const records = Object.values(recordsByUser).map((userData: any) => {
      const userRecords = userData.records;
      const dates = [...new Set(userRecords.map((r: any) => r.timestamp.split('T')[0]))];
      const daysAttended = dates.length;

      let totalHours = 0;
      const recordsByDate: Record<string, any[]> = {};
      for (const record of userRecords) {
        const date = record.timestamp.split('T')[0];
        if (!recordsByDate[date]) recordsByDate[date] = [];
        recordsByDate[date].push(record);
      }

      for (const [dateKey, dayRecords] of Object.entries(recordsByDate)) {
        const checkIn = dayRecords.find((r: any) => r.type === 'check_in');
        const checkOut = dayRecords.find((r: any) => r.type === 'check_out');
        if (checkIn && checkOut) {
          const diff = new Date(checkOut.timestamp).getTime() - new Date(checkIn.timestamp).getTime();
          const lunchOut = dayRecords.find((r: any) => r.type === 'lunch_out');
          const lunchIn = dayRecords.find((r: any) => r.type === 'lunch_in');
          let lunchTime = 0;
          if (lunchOut && lunchIn) {
            lunchTime = new Date(lunchIn.timestamp).getTime() - new Date(lunchOut.timestamp).getTime();
          }
          const breakTime = calculateBreakTime(dayRecords);
          totalHours += (diff - lunchTime - breakTime) / (1000 * 60 * 60);
        }
      }

      return {
        ...userData,
        days_attended: daysAttended,
        hours_worked: Math.round(totalHours * 100) / 100,
      };
    });

    // Calcular métricas adicionales
    const metrics = {
      total_employees: records.length,
      present_today: records.filter((r: any) => r.check_ins > 0).length,
      absent_today: records.filter((r: any) => r.check_ins === 0).length,
      average_check_in: calculateAverageCheckIn(records),
      late_arrivals: countLateArrivals(records)
    };

    return NextResponse.json({
      records,
      metrics
    });
  } catch (error) {
    console.error('Error en reportes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

function calculateAverageCheckIn(records: any[]) {
  const validCheckIns = records
    .flatMap((r) => (r.records || []).filter((rec: any) => rec.type === 'check_in').map((rec: any) => rec.timestamp))
    .filter(Boolean);

  if (validCheckIns.length === 0) {
    return null;
  }

    const totalMinutes = validCheckIns.reduce((acc, timestamp) => {
    const date = new Date(toPeruTimestamp(timestamp));

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

function countLateArrivals(records: any[]) {
  const LATE_HOUR = 9;

    return records.filter((r) => {
    const checkIns = (r.records || []).filter((rec: any) => rec.type === 'check_in');
    if (checkIns.length === 0) {
      return false;
    }

    const checkIn = new Date(toPeruTimestamp(checkIns[0].timestamp));

    return checkIn.getHours() >= LATE_HOUR;
  }).length;
}