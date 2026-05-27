import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// POST - Crear solicitud de corrección
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { attendance_date, request_type, corrected_time, reason } = await req.json();

    if (!attendance_date || !request_type || !corrected_time || !reason) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO correction_requests 
       (user_id, attendance_date, request_type, corrected_time, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [user.userId, attendance_date, request_type, corrected_time, reason]
    );

    return NextResponse.json({
      message: 'Solicitud enviada exitosamente',
      request: result.rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET - Obtener solicitudes (admin ve todas, usuario ve las suyas)
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const isAdmin = user.role === 'admin';
    
    let query = `
      SELECT cr.*, u.name as user_name
      FROM correction_requests cr
      JOIN users u ON cr.user_id = u.id
    `;
    
    const params: any[] = [];
    
    if (!isAdmin) {
      query += ' WHERE cr.user_id = $1';
      params.push(user.userId);
    }
    
    query += ' ORDER BY cr.created_at DESC';
    
    const result = await db.query(query, params);

    return NextResponse.json({ requests: result.rows });
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}