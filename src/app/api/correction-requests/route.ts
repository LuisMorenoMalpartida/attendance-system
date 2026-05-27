import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { attendance_date, request_type, corrected_time, reason } = await req.json();

    if (!attendance_date || !request_type || !corrected_time || !reason) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Crear solicitud
    const result = await db.query(
      `INSERT INTO correction_requests 
       (user_id, attendance_date, request_type, corrected_time, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [authUser.userId, attendance_date, request_type, corrected_time, reason]
    );

    // Obtener nombre del usuario desde la BD
    const userResult = await db.query(
      'SELECT name FROM users WHERE id = $1',
      [authUser.userId]
    );
    const userName = userResult.rows[0]?.name || 'Usuario';

    // Obtener admins para notificar
    const admins = await db.query(
      "SELECT id FROM users WHERE role = 'admin' AND is_active = true"
    );

    // Crear notificaciones para cada admin
    const typeLabels: Record<string, string> = {
      missing_check_in: 'olvidó marcar entrada',
      missing_check_out: 'olvidó marcar salida',
      missing_lunch_out: 'olvidó marcar salida comida',
      missing_lunch_in: 'olvidó marcar regreso comida',
      wrong_time: 'reportó hora incorrecta',
    };

    for (const admin of admins.rows) {
      await db.query(
        `INSERT INTO notifications 
         (user_id, title, message, type, reference_type, reference_id)
         VALUES ($1, $2, $3, 'alert', 'correction_request', $4)`,
        [
          admin.id,
          ' Solicitud de corrección',
          `${userName} ${typeLabels[request_type] || 'solicitó una corrección'} - ${reason}`,
          result.rows[0].id
        ]
      );
    }

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

export async function GET(req: NextRequest) {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const isAdmin = authUser.role === 'admin';
    
    let query = `
      SELECT cr.*, u.name as user_name
      FROM correction_requests cr
      JOIN users u ON cr.user_id = u.id
    `;
    
    const params: any[] = [];
    
    if (!isAdmin) {
      query += ' WHERE cr.user_id = $1';
      params.push(authUser.userId);
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