import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// PUT - Aprobar o rechazar solicitud (solo admin)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const { status, review_notes } = await req.json();

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    const result = await db.query(
      `UPDATE correction_requests 
       SET status = $1, reviewed_by = $2, review_notes = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, admin.userId, review_notes, parseInt(id)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    // Si se aprueba, crear el registro de asistencia
    if (status === 'approved') {
      const request = result.rows[0];
      
      // Mapear el tipo de solicitud al tipo de registro
      const typeMap: Record<string, string> = {
        missing_check_in: 'check_in',
        missing_check_out: 'check_out',
        missing_lunch_out: 'lunch_out',
        missing_lunch_in: 'lunch_in',
        wrong_time: request.request_type.includes('check_in') ? 'check_in' : 
                    request.request_type.includes('check_out') ? 'check_out' :
                    request.request_type.includes('lunch_out') ? 'lunch_out' : 'lunch_in',
      };

      const attendanceType = typeMap[request.request_type] || 'check_in';
      const timestamp = `${request.attendance_date}T${request.corrected_time}:00`;

      await db.query(
        `INSERT INTO attendance_records 
         (user_id, type, timestamp, is_manual, notes, modified_by)
         VALUES ($1, $2, $3, true, $4, $5)`,
        [request.user_id, attendanceType, timestamp, `Corrección aprobada: ${request.reason}`, admin.userId]
      );
    }

    return NextResponse.json({
      message: `Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'}`,
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Error al procesar solicitud:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}