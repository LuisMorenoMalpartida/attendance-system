import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const absenceId = parseInt(params.id);
    const formData = await req.formData();
    const file = formData.get('document') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó documento' }, { status: 400 });
    }

    // Validar que la ausencia pertenece al usuario
    const absence = await db.query(
      'SELECT * FROM absences WHERE id = $1 AND user_id = $2',
      [absenceId, user.userId]
    );

    if (absence.rows.length === 0) {
      return NextResponse.json({ error: 'Ausencia no encontrada' }, { status: 404 });
    }

    const documentUrl = await storage.uploadAbsenceDocument(file, user.userId as number);

    await db.query(
      'UPDATE absences SET document_url = $1 WHERE id = $2',
      [documentUrl, absenceId]
    );

    return NextResponse.json({
      message: 'Documento subido exitosamente',
      documentUrl,
    });
  } catch (error) {
    console.error('Error al subir documento:', error);
    return NextResponse.json(
      { error: 'Error al procesar el documento' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const absenceId = parseInt(params.id);

    const absence = await db.query(
      'SELECT document_url FROM absences WHERE id = $1 AND user_id = $2',
      [absenceId, user.userId]
    );

    if (absence.rows.length === 0 || !absence.rows[0].document_url) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    // Redirigir a la URL del documento (privado)
    return NextResponse.redirect(absence.rows[0].document_url);
  } catch (error) {
    console.error('Error al obtener documento:', error);
    return NextResponse.json(
      { error: 'Error al obtener el documento' },
      { status: 500 }
    );
  }
}