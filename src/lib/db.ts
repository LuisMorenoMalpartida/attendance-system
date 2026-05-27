import { Pool } from '@neondatabase/serverless';

/**
 * Evita recrear conexiones en serverless (Vercel / Next.js)
 */
const globalForDb = globalThis as unknown as {
  pool?: Pool;
};

/**
 * Validación estricta de variable de entorno
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('❌ DATABASE_URL no está definida en el entorno');
}

/**
 * Singleton Pool (crítico para serverless)
 */
const pool =
  globalForDb.pool ??
  new Pool({
    connectionString,
  });

globalForDb.pool = pool;

/**
 * API de acceso a DB
 */
export const db = {
  query: async (text: string, params?: any[]) => {
    const client = await pool.connect();

    try {
      const result = await client.query(text, params);
      return result;
    } catch (error) {
      console.error('❌ DB query error:', error);
      throw error;
    } finally {
      client.release();
    }
  },
};