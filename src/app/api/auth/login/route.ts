import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

// Función para inicializar usuarios de prueba
async function initializeTestUsers() {
  try {
    // Verificar si ya existen usuarios
    const existingUsers = await pool.query('SELECT COUNT(*) FROM users');
    
    if (existingUsers.rows[0].count === '0') {
      // Crear empresa por defecto
      const company = await pool.query(
        'INSERT INTO companies (name) VALUES ($1) RETURNING id',
        ['Empresa Demo']
      );
      const companyId = company.rows[0].id;

      // Hashear contraseñas
      const adminPassword = await bcrypt.hash('admin123', 10);
      const userPassword = await bcrypt.hash('user123', 10);

      // Crear usuario admin
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role, company_id, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['admin', 'admin@empresa.com', adminPassword, 'admin', companyId, true]
      );

      // Crear usuario normal
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role, company_id, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['user', 'user@empresa.com', userPassword, 'user', companyId, true]
      );

      // Crear horario laboral para el usuario
      const user = await pool.query('SELECT id FROM users WHERE name = $1', ['user']);
      
      for (let day = 0; day <= 4; day++) { // Lunes a Viernes
        await pool.query(
          `INSERT INTO work_schedules (user_id, day_of_week, start_time, end_time, tolerance_minutes) 
           VALUES ($1, $2, $3, $4, $5)`,
          [user.rows[0].id, day, '08:00', '17:45', 15]
        );
      }

      console.log('✅ Usuarios de prueba creados exitosamente');
    }
  } catch (error) {
    console.error('Error al inicializar usuarios de prueba:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Inicializar usuarios de prueba si no existen
    await initializeTestUsers();

    const { name, password } = await req.json();

    if (!name || !password) {
      return NextResponse.json(
        { error: 'Nombre y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Buscar usuario
    const result = await pool.query(
      'SELECT * FROM users WHERE name = $1 AND is_active = true',
      [name]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o inactivo' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta' },
        { status: 401 }
      );
    }

    // Crear sesión
    await createSession(user.id, user.role);

    return NextResponse.json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      role: user.role,
    });
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}