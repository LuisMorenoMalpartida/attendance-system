import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime, format as formatTZ } from 'date-fns-tz';

// Zona horaria de Perú
export const PERU_TIMEZONE = 'America/Lima';

/**
 * Formatea una fecha ISO a hora local (HH:MM)
 * Ej: "08:00"
 */
export function formatTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '--:--';
  
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
  const zonedDate = toZonedTime(date, PERU_TIMEZONE);
  
  return format(zonedDate, 'HH:mm');
}

/**
 * Formatea una fecha ISO a hora con segundos (HH:MM:SS)
 * Ej: "08:00:00"
 */
export function formatTimeWithSeconds(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '--:--:--';
  
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
  const zonedDate = toZonedTime(date, PERU_TIMEZONE);
  
  return format(zonedDate, 'HH:mm:ss');
}

/**
 * Formatea una fecha ISO a fecha legible
 * Ej: "lunes, 27 de mayo de 2026"
 */
export function formatDate(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '--/--/----';
  
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
  const zonedDate = toZonedTime(date, PERU_TIMEZONE);
  
  return format(zonedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
}

/**
 * Formatea una fecha ISO a fecha corta
 * Ej: "27/05/2026"
 */
export function formatShortDate(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '--/--/----';
  
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
  const zonedDate = toZonedTime(date, PERU_TIMEZONE);
  
  return format(zonedDate, 'dd/MM/yyyy');
}

/**
 * Formatea una fecha ISO a fecha y hora
 * Ej: "27/05/2026 08:00"
 */
export function formatDateTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '--/--/---- --:--';
  
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
  const zonedDate = toZonedTime(date, PERU_TIMEZONE);
  
  return format(zonedDate, "dd/MM/yyyy 'a las' HH:mm", { locale: es });
}

/**
 * Formatea horas trabajadas (decimal) a HH:MM
 * Ej: 8.75 → "8h 45m"
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
 * Obtiene la fecha actual en formato ISO (hora local Perú)
 */
export function getNowISO(): string {
  return new Date().toISOString();
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 */
export function getTodayString(): string {
  const zonedDate = toZonedTime(new Date(), PERU_TIMEZONE);
  return format(zonedDate, 'yyyy-MM-dd');
}

/**
 * Formatea una fecha relativa
 * Ej: "hace 5 minutos", "ayer a las 08:00"
 */
export function formatRelativeTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '';
  
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
  
  if (isToday(date)) {
    return `Hoy a las ${formatTime(timestamp)}`;
  }
  
  if (isYesterday(date)) {
    return `Ayer a las ${formatTime(timestamp)}`;
  }
  
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
}

/**
 * Formatea un mes y año
 * Ej: "mayo de 2026"
 */
export function formatMonthYear(date: Date): string {
  const zonedDate = toZonedTime(date, PERU_TIMEZONE);
  return format(zonedDate, "MMMM 'de' yyyy", { locale: es });
}

/**
 * Obtiene el día de la semana
 * Ej: "lunes"
 */
export function getDayOfWeek(date: Date): string {
  const zonedDate = toZonedTime(date, PERU_TIMEZONE);
  return format(zonedDate, 'EEEE', { locale: es });
}

/**
 * Compara dos fechas (ignorando hora) para ver si son el mismo día
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  
  const zoned1 = toZonedTime(d1, PERU_TIMEZONE);
  const zoned2 = toZonedTime(d2, PERU_TIMEZONE);
  
  return format(zoned1, 'yyyy-MM-dd') === format(zoned2, 'yyyy-MM-dd');
}