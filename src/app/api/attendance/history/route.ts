import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const month = searchParams.get('month') || (new Date().getMonth() + 1).toString();

    const result = await db.query(
      `SELECT 
        id, type, timestamp, notes, is_manual, 
        latitude, longitude, DATE(timestamp) as date
       FROM attendance_records 
       WHERE user_id = $1 
       AND EXTRACT(YEAR FROM timestamp) = $2 
       AND EXTRACT(MONTH FROM timestamp) = $3 
       ORDER BY DATE(timestamp) DESC, timestamp ASC`,
      [user.userId, year, month]
    );

    // 👇 Normalizar timestamps: quitar la Z y convertir a hora local
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
        const diff =
          new Date(checkOut.timestamp).getTime() -
          new Date(checkIn.timestamp).getTime();

        const lunchOut = day.records.find((r: any) => r.type === 'lunch_out');
        const lunchIn = day.records.find((r: any) => r.type === 'lunch_in');

        let lunchTime = 0;
        if (lunchOut && lunchIn) {
          lunchTime =
            new Date(lunchIn.timestamp).getTime() -
            new Date(lunchOut.timestamp).getTime();
        }

        day.hoursWorked = (diff - lunchTime) / (1000 * 60 * 60);
      }

      return day;
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// 👇 Función para normalizar timestamp (quitar UTC y dejar hora local)
function normalizeTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    // Si la fecha es inválida, devolver el original
    if (isNaN(date.getTime())) return timestamp;
    
    // Convertir a hora Perú y devolver sin timezone
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