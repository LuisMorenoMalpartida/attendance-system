import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params; // 👈 await aquí
    const userId = parseInt(id);
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const month = searchParams.get('month') || (new Date().getMonth() + 1).toString();

    const result = await db.query(
      `SELECT 
        ar.id, ar.type, ar.timestamp, ar.notes, ar.is_manual, 
        ar.latitude, ar.longitude, DATE(ar.timestamp) as date
       FROM attendance_records ar
       WHERE ar.user_id = $1
       AND EXTRACT(YEAR FROM ar.timestamp) = $2
       AND EXTRACT(MONTH FROM ar.timestamp) = $3
       ORDER BY DATE(ar.timestamp) DESC, ar.timestamp ASC`,
      [userId, year, month]
    );

    // Agrupar por fecha y calcular horas
    const recordsByDate: Record<string, any> = {};
    
    result.rows.forEach((record: any) => {
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

    const records = Object.values(recordsByDate).map((day: any) => {
      const checkIn = day.records.find((r: any) => r.type === 'check_in');
      const checkOut = day.records.find((r: any) => r.type === 'check_out');
      
      if (checkIn && checkOut) {
        const diff = new Date(checkOut.timestamp).getTime() - new Date(checkIn.timestamp).getTime();
        const lunchOut = day.records.find((r: any) => r.type === 'lunch_out');
        const lunchIn = day.records.find((r: any) => r.type === 'lunch_in');
        
        let lunchTime = 0;
        if (lunchOut && lunchIn) {
          lunchTime = new Date(lunchIn.timestamp).getTime() - new Date(lunchOut.timestamp).getTime();
        }
        
        day.hoursWorked = (diff - lunchTime) / (1000 * 60 * 60);
      }
      
      return day;
    });

    // Calcular estadísticas
    const stats = {
      totalHours: records.reduce((sum: number, day: any) => sum + (day.hoursWorked || 0), 0),
      daysWorked: records.length,
      averageCheckIn: '--:--',
      lateArrivals: 0,
    };

    return NextResponse.json({ records, stats });
  } catch (error) {
    console.error('Error al obtener registros:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}