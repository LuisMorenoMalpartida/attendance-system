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
    const year = parseInt(searchParams.get('year') || '', 10);
    const month = parseInt(searchParams.get('month') || '', 10);

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Parámetros de fecha inválidos' },
        { status: 400 }
      );
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const result = await db.query(
      `SELECT * FROM attendance_records
       WHERE user_id = $1
       AND timestamp >= $2
       AND timestamp < $3
       ORDER BY timestamp ASC`,
      [user.userId, startDate.toISOString(), endDate.toISOString()]
    );

    const records = result.rows;
    const groupedRecords: Array<{
      date: string;
      records: Array<{ id: number; type: string; timestamp: string; notes: string | null }>;
      hoursWorked: number | null;
    }> = [];

    const mapByDate = new Map<string, typeof records>();

    records.forEach((record: any) => {
      const timestamp = new Date(record.timestamp);
      const dateKey = timestamp.toISOString().slice(0, 10);
      const dayRecords = mapByDate.get(dateKey) || [];
      dayRecords.push({
        id: record.id,
        type: record.type,
        timestamp: record.timestamp,
        notes: record.notes,
      });
      mapByDate.set(dateKey, dayRecords);
    });

    for (const [date, dayRecords] of mapByDate.entries()) {
      const checkIn = dayRecords.find((r) => r.type === 'check_in');
      const checkOut = [...dayRecords].reverse().find((r) => r.type === 'check_out');

      const hoursWorked =
        checkIn && checkOut
          ?
            (new Date(checkOut.timestamp).getTime() - new Date(checkIn.timestamp).getTime()) /
            3600000
          : null;

      groupedRecords.push({
        date,
        records: dayRecords,
        hoursWorked: hoursWorked !== null ? Number(hoursWorked.toFixed(2)) : null,
      });
    }

    groupedRecords.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ records: groupedRecords });
  } catch (error) {
    console.error('Error al obtener historial de asistencia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
