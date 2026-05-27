import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { uploadImage } from '@/lib/upload';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const companyName = formData.get('companyName') as string;
    const role = formData.get('role') as string;
    const profilePhoto = formData.get('profilePhoto') as File | null;

    // Validaciones
    if (!name || !email || !password || !companyName || !role) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'El formato del email no es válido' },
        { status: 400 }
      );
    }

    // Verificar si el usuario ya existe
    const existingUser = await db.query(
      'SELECT id FROM users WHERE name = $1 OR email = $2',
      [name, email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'El usuario o email ya está registrado' },
        { status: 400 }
      );
    }

    // Crear o obtener empresa
    let companyResult = await db.query(
      'SELECT id FROM companies WHERE name = $1',
      [companyName]
    );

    let companyId: number;

    if (companyResult.rows.length === 0) {
      const newCompany = await db.query(
        'INSERT INTO companies (name) VALUES ($1) RETURNING id',
        [companyName]
      );
      companyId = newCompany.rows[0].id;
    } else {
      companyId = companyResult.rows[0].id;
    }

    // Procesar foto de perfil con Vercel Blob
    let photoUrl: string | null = null;
    if (profilePhoto && profilePhoto.size > 0) {
      try {
        const result = await uploadImage(profilePhoto, name, {
          folder: 'profiles',
          maxSizeMB: 5,
        });
        photoUrl = result.url;
      } catch (error: any) {
        console.error('Error al subir foto:', error);
        return NextResponse.json(
          { error: `Error al subir foto: ${error.message}` },
          { status: 400 }
        );
      }
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, company_id, profile_photo, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, name, email, role, company_id, profile_photo, is_active, created_at`,
      [name, email, hashedPassword, role, companyId, photoUrl]
    );

    // Crear horario laboral por defecto para usuarios
    if (role === 'user') {
      for (let day = 0; day <= 4; day++) {
        await db.query(
          `INSERT INTO work_schedules (user_id, day_of_week, start_time, end_time, tolerance_minutes)
           VALUES ($1, $2, '08:00', '17:45', 15)`,
          [result.rows[0].id, day]
        );
      }
    }

    return NextResponse.json({
      message: 'Usuario registrado exitosamente',
      user: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Error en registro:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}