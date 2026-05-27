import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

export const PERU_TIMEZONE = 'America/Lima';

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
  const now = new Date();
  const peruString = now.toLocaleString('en-US', { timeZone: PERU_TIMEZONE });
  const peruDate = new Date(peruString);
  
  const year = peruDate.getFullYear();
  const month = String(peruDate.getMonth() + 1).padStart(2, '0');
  const day = String(peruDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Extrae solo la fecha (YYYY-MM-DD) de cualquier formato de timestamp
 */
function extractDate(timestamp: string): string {
  // Si ya es solo fecha YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
    return timestamp;
  }
  // Si es timestamp ISO: "2026-05-27T08:00:00" o "2026-05-27T05:00:00.000Z"
  return timestamp.split('T')[0];
}

/**
 * Crea un objeto Date seguro a partir de una fecha string
 */
function safeDate(dateStr: string): Date {
  const date = new Date(dateStr);
  // Si es inválido, intentar extraer solo la fecha
  if (isNaN(date.getTime())) {
    const extracted = extractDate(dateStr);
    return new Date(extracted + 'T12:00:00');
  }
  return date;
}

/**
 * Formatea una hora (HH:MM)
 */
export function formatTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '--:--';
  
  const date = typeof timestamp === 'string' ? safeDate(timestamp) : timestamp;
  
  if (isNaN(date.getTime())) return '--:--';
  
  return format(date, 'HH:mm');
}

/**
 * Formatea una fecha legible
 * Soporta: "2026-05-27", "2026-05-27T08:00:00", "2026-05-27T05:00:00.000Z"
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '--/--/----';
  
  let date: Date;
  
  if (typeof dateStr === 'string') {
    // Extraer solo la parte de la fecha
    const justDate = extractDate(dateStr);
    date = new Date(justDate + 'T12:00:00');
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
    const justDate = extractDate(dateStr);
    date = new Date(justDate + 'T12:00:00');
  } else {
    date = dateStr;
  }
  
  if (isNaN(date.getTime())) return '--/--/----';
  
  return format(date, 'dd/MM/yyyy');
}

/**
 * Formatea fecha y hora
 */
export function formatDateTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '--/--/---- --:--';
  
  const date = typeof timestamp === 'string' ? safeDate(timestamp) : timestamp;
  
  if (isNaN(date.getTime())) return '--/--/---- --:--';
  
  return format(date, "dd/MM/yyyy 'a las' HH:mm", { locale: es });
}

/**
 * Formatea horas trabajadas (decimal)
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
 */
export function formatHoursDecimal(hours: number | null | undefined): string {
  if (!hours && hours !== 0) return '--:--';
  
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Formatea un mes y año
 */
export function formatMonthYear(date: Date): string {
  return format(date, "MMMM 'de' yyyy", { locale: es });
}

/**
 * Formatea una fecha relativa
 */
export function formatRelativeTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '';
  
  const date = typeof timestamp === 'string' ? safeDate(timestamp) : timestamp;
  
  if (isNaN(date.getTime())) return '';
  
  if (isToday(date)) {
    return `Hoy a las ${formatTime(timestamp)}`;
  }
  
  if (isYesterday(date)) {
    return `Ayer a las ${formatTime(timestamp)}`;
  }
  
  return format(date, "d 'de' MMMM 'a las' HH:mm", { locale: es });
}