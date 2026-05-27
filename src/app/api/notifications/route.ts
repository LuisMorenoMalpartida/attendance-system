import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        let query = `
            SELECT n.*, 
                   cr.status as correction_status,
                   u.name as requester_name
            FROM notifications n
            LEFT JOIN correction_requests cr ON n.reference_id = cr.id AND n.reference_type = 'correction_request'
            LEFT JOIN users u ON cr.user_id = u.id
            WHERE n.user_id = $1
            ORDER BY n.created_at DESC
            LIMIT 50
        `;

        const result = await db.query(query, [user.userId]);

        const notifications = result.rows.map((row: any) => ({
            ...row,
            metadata: {
                status: row.correction_status,
                requester_name: row.requester_name,
            }
        }));

        return NextResponse.json({ notifications });
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}