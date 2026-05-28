import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

export const PERU_TIMEZONE = 'America/Lima';

// ============================================================
// OBTENER FECHA/HORA ACTUAL EN PERÚ
// ============================================================

/**
 * Obtiene la fecha y hora actual en Perú como string (YYYY-MM-DDTHH:MM:SS)
 */
export function getPeruNowTimestamp(): string {
  const now = new Date();
  const peruString = now.toLocaleString('en-US', { timeZone: PERU_TIMEZONE });
  const peruDate = new Date(peruString);
  
  const year = peruDate.getFullYear();
  const month = String(peruDate.getMonth() + 1).padStart(2, '0');
  const day = String(peruDate.getDate()).padStart(2, '0');
  const hours = String(peruDate.getHours()).padStart(2, '0');
  const minutes = String(peruDate.getMinutes()).padStart(2, '0');
  const seconds = String(peruDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Obtiene la fecha actual en Perú como YYYY-MM-DD
 */
export function getPeruToday(): string {
  return getPeruNowTimestamp().split('T')[0];
}

/**
 * Formatea un objeto Date a YYYY-MM-DD en zona horaria Perú
 */
export function formatDateToPeruYYYYMMDD(d: Date): string {
  const peruString = d.toLocaleString('en-US', { timeZone: PERU_TIMEZONE });
  const peruDate = new Date(peruString);
  const year = peruDate.getFullYear();
  const month = String(peruDate.getMonth() + 1).padStart(2, '0');
  const day = String(peruDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea un objeto Date a YYYY-MM-DDTHH:MM:SS en zona horaria Perú
 */
export function formatDateToPeruTimestamp(d: Date): string {
  const peruString = d.toLocaleString('en-US', { timeZone: PERU_TIMEZONE });
  const peruDate = new Date(peruString);
  const year = peruDate.getFullYear();
  const month = String(peruDate.getMonth() + 1).padStart(2, '0');
  const day = String(peruDate.getDate()).padStart(2, '0');
  const hours = String(peruDate.getHours()).padStart(2, '0');
  const minutes = String(peruDate.getMinutes()).padStart(2, '0');
  const seconds = String(peruDate.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Convierte un timestamp ISO (UTC) a hora Perú sin timezone
 */
export function toPeruTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const peruString = date.toLocaleString('en-US', { timeZone: PERU_TIMEZONE });
  const peruDate = new Date(peruString);
  
  const year = peruDate.getFullYear();
  const month = String(peruDate.getMonth() + 1).padStart(2, '0');
  const day = String(peruDate.getDate()).padStart(2, '0');
  const hours = String(peruDate.getHours()).padStart(2, '0');
  const minutes = String(peruDate.getMinutes()).padStart(2, '0');
  const seconds = String(peruDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

// ============================================================
// PARSEO DE FECHAS (LA CLAVE DEL PROBLEMA)
// ============================================================

/**
 * Extrae solo la fecha (YYYY-MM-DD) de cualquier formato
 */
function extractDate(timestamp: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) return timestamp;
  return timestamp.split('T')[0];
}

/**
 * 👇 Parsea un timestamp SIN zona horaria como hora LOCAL
 * "2026-05-27T17:47:39" → Date con 17:47 en hora local
 * "2026-05-27" → Date con 12:00 en hora local
 */
function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);

  // Normalizar separador 'T' o espacio, quitar milisegundos y offsets
  let s = String(dateStr).trim();
  // Reemplazar separador espacio por 'T' para manejo uniforme
  s = s.replace(' ', 'T');
  // Quitar parte fractional (ej. .123) y zona (Z, +05:00, -0500)
  s = s.split('.')[0].replace(/([+-]\d{2}:?\d{2}|Z)$/, '');

  const [datePart, timePart] = s.split('T');
  const [year, month, day] = (datePart || '').split('-').map(Number);

  if (timePart) {
    const [hours, minutes, seconds] = (timePart || '').split(':').map(Number);
    return new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, seconds || 0);
  }

  // Solo fecha, usar mediodía para evitar cambios de zona
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
}

// ============================================================
// FORMATEO DE HORAS
// ============================================================

/**
 * Formatea una hora (HH:MM)
 * "2026-05-27T17:47:39" → "17:47"
 * "2026-05-27T17:47:39.000Z" → hora Perú correcta
 */
export function formatTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '--:--';
  
  let date: Date;
  
  if (typeof timestamp === 'string') {
    // Si tiene Z o +00:00, es UTC → convertir a Perú
    if (timestamp.includes('Z') || timestamp.includes('+')) {
      const peruTimestamp = toPeruTimestamp(timestamp);
      date = parseLocalDate(peruTimestamp);
    } else {
      // Sin zona → es hora local
      date = parseLocalDate(timestamp);
    }
  } else {
    date = timestamp;
  }
  
  if (isNaN(date.getTime())) return '--:--';
  
  return format(date, 'HH:mm');
}

/**
 * Formatea una hora con segundos (HH:MM:SS)
 */
export function formatTimeWithSeconds(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '--:--:--';
  
  let date: Date;
  
  if (typeof timestamp === 'string') {
    if (timestamp.includes('Z') || timestamp.includes('+')) {
      date = parseLocalDate(toPeruTimestamp(timestamp));
    } else {
      date = parseLocalDate(timestamp);
    }
  } else {
    date = timestamp;
  }
  
  if (isNaN(date.getTime())) return '--:--:--';
  
  return format(date, 'HH:mm:ss');
}

// ============================================================
// FORMATEO DE FECHAS
// ============================================================

/**
 * Formatea una fecha legible
 * "2026-05-27" → "martes, 27 de mayo de 2026"
 * "2026-05-27T17:47:39" → "martes, 27 de mayo de 2026"
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '--/--/----';
  
  let date: Date;
  
  if (typeof dateStr === 'string') {
    const justDate = extractDate(dateStr);
    date = parseLocalDate(justDate);
  } else {
    date = dateStr;
  }
  
  if (isNaN(date.getTime())) return '--/--/----';
  
  return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
}

/**
 * Formatea una fecha corta (DD/MM/YYYY)
 */
export function formatShortDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '--/--/----';
  
  let date: Date;
  
  if (typeof dateStr === 'string') {
    date = parseLocalDate(extractDate(dateStr));
  } else {
    date = dateStr;
  }
  
  if (isNaN(date.getTime())) return '--/--/----';
  
  return format(date, 'dd/MM/yyyy');
}

/**
 * Formatea fecha y hora
 * "2026-05-27T17:47:39" → "27/05/2026 a las 17:47"
 */
export function formatDateTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '--/--/---- --:--';
  
  let date: Date;
  
  if (typeof timestamp === 'string') {
    if (timestamp.includes('Z') || timestamp.includes('+')) {
      date = parseLocalDate(toPeruTimestamp(timestamp));
    } else {
      date = parseLocalDate(timestamp);
    }
  } else {
    date = timestamp;
  }
  
  if (isNaN(date.getTime())) return '--/--/---- --:--';
  
  return format(date, "dd/MM/yyyy 'a las' HH:mm", { locale: es });
}

// ============================================================
// FORMATEO DE HORAS TRABAJADAS
// ============================================================

/**
 * Formatea horas trabajadas (decimal) a texto
 * 8.75 → "8h 45m"
 */
export function formatHoursWorked(hours: number | null | undefined): string {
  if (!hours && hours !== 0) return '--:--';
  
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  
  if (h === 0 && m === 0) return '0h';
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Formatea horas trabajadas en HH:MM
 * 8.75 → "08:45"
 */
export function formatHoursDecimal(hours: number | null | undefined): string {
  if (!hours && hours !== 0) return '--:--';
  
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// ============================================================
// FORMATEO DE MES Y AÑO
// ============================================================

/**
 * Formatea un mes y año
 * Date(2026, 4) → "mayo de 2026"
 */
export function formatMonthYear(date: Date): string {
  return format(date, "MMMM 'de' yyyy", { locale: es });
}

// ============================================================
// FORMATEO RELATIVO
// ============================================================

/**
 * Formatea una fecha relativa
 * "hace 5 minutos", "hoy a las 17:47", "ayer a las 08:00"
 */
export function formatRelativeTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '';
  
  let date: Date;
  
  if (typeof timestamp === 'string') {
    if (timestamp.includes('Z') || timestamp.includes('+')) {
      date = parseLocalDate(toPeruTimestamp(timestamp));
    } else {
      date = parseLocalDate(timestamp);
    }
  } else {
    date = timestamp;
  }
  
  if (isNaN(date.getTime())) return '';
  
  if (isToday(date)) return `Hoy a las ${formatTime(timestamp)}`;
  if (isYesterday(date)) return `Ayer a las ${formatTime(timestamp)}`;
  
  return format(date, "d 'de' MMMM 'a las' HH:mm", { locale: es });
}

