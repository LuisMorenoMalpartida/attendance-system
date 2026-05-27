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
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const month = searchParams.get('month') || (new Date().getMonth() + 1).toString();
    const own = searchParams.get('own');

    let query = `
      SELECT 
        ar.id, ar.user_id, u.name as user_name, ar.type, 
        ar.timestamp, ar.notes, ar.is_manual, ar.latitude, ar.longitude,
        DATE(ar.timestamp) as date
      FROM attendance_records ar
      JOIN users u ON ar.user_id = u.id
      WHERE EXTRACT(YEAR FROM ar.timestamp) = $1
      AND EXTRACT(MONTH FROM ar.timestamp) = $2
    `;

    const params: any[] = [year, month];

    if (own === 'true') {
      query += ' AND ar.user_id = $3';
      params.push(admin.userId);
    }

    query += ' ORDER BY DATE(ar.timestamp) DESC, ar.timestamp ASC';

    const result = await db.query(query, params);

    // Agrupar por fecha
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

    // Calcular horas trabajadas por día
    const records = Object.values(recordsByDate).map((day: any) => {
      const checkIn = day.records.find((r: any) => r.type === 'check_in');
      const checkOut = day.records.find((r: any) => r.type === 'check_out');
      
      if (checkIn && checkOut) {
        const diff = new Date(checkOut.timestamp).getTime() - new Date(checkIn.timestamp).getTime();
        
        // Restar tiempo de comida si existe
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

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Error al obtener registros:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}