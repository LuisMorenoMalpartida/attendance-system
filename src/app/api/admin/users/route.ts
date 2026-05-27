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
    const active = searchParams.get('active');

    let query = `
      SELECT 
        u.id, u.name, u.email, u.role, u.is_active, u.profile_photo,
        c.name as company_name,
        (
          SELECT ar.timestamp 
          FROM attendance_records ar 
          WHERE ar.user_id = u.id 
          ORDER BY ar.timestamp DESC 
          LIMIT 1
        ) as last_attendance
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (active === 'true') {
      query += ' AND u.is_active = true';
    }

    query += ' ORDER BY u.name ASC';

    const result = await db.query(query, params);

    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}