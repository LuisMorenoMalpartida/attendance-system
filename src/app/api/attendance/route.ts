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

    // 👇 Normalizar timestamps
    const normalizedRows = result.rows.map((row: any) => ({
      ...row,
      timestamp: normalizeTimestamp(row.timestamp),
    }));

    // Agrupar por fecha
    const recordsByDate: Record<string, any> = {};
    
    normalizedRows.forEach((record: any) => {
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

// 👇 Misma función normalizeTimestamp
function normalizeTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp;
    
    const peruString = date.toLocaleString('en-US', { timeZone: 'America/Lima' });
    const peruDate = new Date(peruString);
    
    const year = peruDate.getFullYear();
    const month = String(peruDate.getMonth() + 1).padStart(2, '0');
    const day = String(peruDate.getDate()).padStart(2, '0');
    const hours = String(peruDate.getHours()).padStart(2, '0');
    const minutes = String(peruDate.getMinutes()).padStart(2, '0');
    const seconds = String(peruDate.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  } catch {
    return timestamp;
  }
}