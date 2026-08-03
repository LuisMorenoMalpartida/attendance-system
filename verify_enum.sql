SELECT
  t.typname AS enum_type,
  ARRAY_AGG(e.enumlabel ORDER BY e.enumsortorder) AS values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'attendance_type'
GROUP BY t.typname;
