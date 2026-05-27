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

    const request = result.rows[0];

    // Si se aprueba, crear registro de asistencia
    if (status === 'approved') {
      // ... (código de creación de registro)
    }

    // Notificar al usuario que hizo la solicitud
    const statusLabels: Record<string, string> = {
      approved: 'aprobada',
      rejected: 'rechazada',
    };

    await db.query(
      `INSERT INTO notifications 
             (user_id, title, message, type, reference_type, reference_id)
             VALUES ($1, $2, $3, 'info', 'correction_request', $4)`,
      [
        request.user_id,
        `Solicitud ${statusLabels[status]}`,
        `Tu solicitud de corrección del día ${new Date(request.attendance_date).toLocaleDateString('es-ES')} fue ${statusLabels[status]}. ${review_notes || ''}`,
        request.id
      ]
    );

    return NextResponse.json({
      message: `Solicitud ${statusLabels[status]}`,
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Error al procesar solicitud:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}