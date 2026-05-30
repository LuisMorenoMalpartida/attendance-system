-- Agregar horario de sábado a usuarios que no lo tengan
INSERT INTO work_schedules (user_id, day_of_week, start_time, end_time, tolerance_minutes, is_active)
SELECT u.id, 6, '09:00', '12:00', 15, true
FROM users u
WHERE u.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM work_schedules ws 
  WHERE ws.user_id = u.id AND ws.day_of_week = 6
);