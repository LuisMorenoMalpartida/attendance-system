import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

export const PERU_TIMEZONE = 'America/Lima';

// ============================================================
// HELPERS INTERNOS
// ============================================================

/**
 * Detecta si un timestamp tiene información de zona horaria
 * Ej:
 * 2026-05-27T22:47:39Z
 * 2026-05-27T22:47:39+00:00
 * 2026-05-27T22:47:39-05:00
 */
function hasTimezone(timestamp: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp);
}

/**
 * Convierte una fecha a partes usando timezone Perú
 */
function getPeruDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PERU_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value || '00';

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hours: get('hour'),
    minutes: get('minute'),
    seconds: get('second'),
  };
}

/**
 * Convierte Date → timestamp Perú sin timezone
 * Resultado:
 * 2026-05-27T17:47:39
 */
function buildPeruTimestamp(date: Date): string {
  const p = getPeruDateParts(date);

  return `${p.year}-${p.month}-${p.day}T${p.hours}:${p.minutes}:${p.seconds}`;
}

/**
 * Extrae solo la fecha YYYY-MM-DD
 */
function extractDate(timestamp: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
    return timestamp;
  }

  return timestamp.split('T')[0];
}

/**
 * Parsea fecha LOCAL sin interpretaciones UTC raras.
 *
 * IMPORTANTE:
 * new Date("2026-05-27T17:47:39")
 * puede comportarse distinto según entorno.
 *
 * Esta función SIEMPRE crea una fecha local estable.
 */
function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);

  let s = String(dateStr).trim();

  // Normalizar separador
  s = s.replace(' ', 'T');

  // Eliminar milisegundos
  s = s.split('.')[0];

  // Eliminar timezone
  s = s.replace(/(?:Z|[+-]\d{2}:?\d{2})$/i, '');

  const [datePart, timePart] = s.split('T');

  const [year, month, day] = (datePart || '')
    .split('-')
    .map(Number);

  // Validación básica
  if (!year || !month || !day) {
    return new Date(NaN);
  }

  // Fecha + hora
  if (timePart) {
    const [hours, minutes, seconds] = timePart
      .split(':')
      .map(Number);

    return new Date(
      year,
      month - 1,
      day,
      hours || 0,
      minutes || 0,
      seconds || 0
    );
  }

  // Solo fecha → usar mediodía
  // evita problemas de cambio de día por timezone
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Convierte cualquier valor a Date segura
 */
function normalizeDate(
  input: string | Date | null | undefined
): Date {
  if (!input) return new Date(NaN);

  // Ya es Date
  if (input instanceof Date) {
    return input;
  }

  // Tiene timezone → convertir a Perú
  if (hasTimezone(input)) {
    const peruTimestamp = toPeruTimestamp(input);
    return parseLocalDate(peruTimestamp);
  }

  // Ya es hora local Perú
  return parseLocalDate(input);
}

// ============================================================
// FECHA/HORA ACTUAL PERÚ
// ============================================================

/**
 * Obtiene timestamp actual Perú
 *
 * Resultado:
 * 2026-05-27T17:47:39
 */
export function getPeruNowTimestamp(): string {
  return buildPeruTimestamp(new Date());
}

/**
 * Obtiene fecha actual Perú
 *
 * Resultado:
 * 2026-05-27
 */
export function getPeruToday(): string {
  return getPeruNowTimestamp().split('T')[0];
}

/**
 * Convierte UTC → timestamp Perú sin timezone
 *
 * Ej:
 * 2026-05-27T22:47:39.000Z
 * →
 * 2026-05-27T17:47:39
 */
export function toPeruTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);

  if (isNaN(date.getTime())) {
    return '';
  }

  return buildPeruTimestamp(date);
}

// ============================================================
// FORMATEO DE HORAS
// ============================================================

/**
 * Formatea hora
 *
 * Resultado:
 * 17:47
 */
export function formatTime(
  timestamp: string | Date | null | undefined
): string {
  const date = normalizeDate(timestamp);

  if (isNaN(date.getTime())) {
    return '--:--';
  }

  return format(date, 'HH:mm');
}

/**
 * Formatea hora con segundos
 *
 * Resultado:
 * 17:47:39
 */
export function formatTimeWithSeconds(
  timestamp: string | Date | null | undefined
): string {
  const date = normalizeDate(timestamp);

  if (isNaN(date.getTime())) {
    return '--:--:--';
  }

  return format(date, 'HH:mm:ss');
}

// ============================================================
// FORMATEO DE FECHAS
// ============================================================

/**
 * Formatea fecha larga
 *
 * Resultado:
 * martes, 27 de mayo de 2026
 */
export function formatDate(
  dateStr: string | Date | null | undefined
): string {
  if (!dateStr) {
    return '--/--/----';
  }

  let date: Date;

  if (typeof dateStr === 'string') {
    date = parseLocalDate(extractDate(dateStr));
  } else {
    date = dateStr;
  }

  if (isNaN(date.getTime())) {
    return '--/--/----';
  }

  return format(
    date,
    "EEEE, d 'de' MMMM 'de' yyyy",
    { locale: es }
  );
}

/**
 * Formatea fecha corta
 *
 * Resultado:
 * 27/05/2026
 */
export function formatShortDate(
  dateStr: string | Date | null | undefined
): string {
  if (!dateStr) {
    return '--/--/----';
  }

  let date: Date;

  if (typeof dateStr === 'string') {
    date = parseLocalDate(extractDate(dateStr));
  } else {
    date = dateStr;
  }

  if (isNaN(date.getTime())) {
    return '--/--/----';
  }

  return format(date, 'dd/MM/yyyy');
}

/**
 * Formatea fecha + hora
 *
 * Resultado:
 * 27/05/2026 a las 17:47
 */
export function formatDateTime(
  timestamp: string | Date | null | undefined
): string {
  const date = normalizeDate(timestamp);

  if (isNaN(date.getTime())) {
    return '--/--/---- --:--';
  }

  return format(
    date,
    "dd/MM/yyyy 'a las' HH:mm",
    { locale: es }
  );
}

// ============================================================
// HORAS TRABAJADAS
// ============================================================

/**
 * Decimal → texto
 *
 * 8.75 → 8h 45m
 */
export function formatHoursWorked(
  hours: number | null | undefined
): string {
  if (hours === null || hours === undefined) {
    return '--:--';
  }

  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (h === 0 && m === 0) return '0h';
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;

  return `${h}h ${m}m`;
}

/**
 * Decimal → HH:MM
 *
 * 8.75 → 08:45
 */
export function formatHoursDecimal(
  hours: number | null | undefined
): string {
  if (hours === null || hours === undefined) {
    return '--:--';
  }

  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ============================================================
// MES/AÑO
// ============================================================

/**
 * Resultado:
 * mayo de 2026
 */
export function formatMonthYear(date: Date): string {
  return format(
    date,
    "MMMM 'de' yyyy",
    { locale: es }
  );
}

// ============================================================
// FORMATO RELATIVO
// ============================================================

/**
 * Resultado:
 * Hoy a las 17:47
 * Ayer a las 08:00
 * 25 de mayo a las 14:00
 */
export function formatRelativeTime(
  timestamp: string | Date | null | undefined
): string {
  const date = normalizeDate(timestamp);

  if (isNaN(date.getTime())) {
    return '';
  }

  if (isToday(date)) {
    return `Hoy a las ${format(date, 'HH:mm')}`;
  }

  if (isYesterday(date)) {
    return `Ayer a las ${format(date, 'HH:mm')}`;
  }

  return format(
    date,
    "d 'de' MMMM 'a las' HH:mm",
    { locale: es }
  );
}