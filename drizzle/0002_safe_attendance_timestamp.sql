-- `attendance_records.timestamp` es una columna TEXT (ver 0001). Un cast directo
-- `timestamp::timestamp` revienta con "invalid input syntax for type timestamp"
-- si alguna fila guarda '' o un valor no parseable.
--
-- safe_ts() devuelve NULL en lugar de lanzar error, de modo que las consultas
-- de agregación no se caen por filas corruptas.
CREATE OR REPLACE FUNCTION public.safe_ts(value text)
RETURNS timestamp
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
  trimmed text;
BEGIN
  IF value IS NULL THEN
    RETURN NULL;
  END IF;

  trimmed := btrim(value);
  IF trimmed = '' THEN
    RETURN NULL;
  END IF;

  RETURN trimmed::timestamp;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$fn$;--> statement-breakpoint

-- Elimina registros sin marca de tiempo utilizable (no aportan información y
-- ensucian los cálculos de horas).
DELETE FROM "attendance_records"
WHERE "timestamp" IS NULL OR btrim("timestamp") = '';--> statement-breakpoint

-- Evita que se acumulen de nuevo filas sin timestamp.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_records_timestamp_not_blank'
  ) THEN
    ALTER TABLE "attendance_records"
      ADD CONSTRAINT "attendance_records_timestamp_not_blank"
      CHECK ("timestamp" IS NOT NULL AND btrim("timestamp") <> '');
  END IF;
END;
$do$;