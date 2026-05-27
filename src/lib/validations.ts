import { z } from 'zod';

// Validaciones que coinciden con las restricciones de PostgreSQL
export const loginSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(255, 'El nombre es muy largo')
    .trim(),
  password: z
    .string()
    .min(3, 'La contraseña debe tener al menos 3 caracteres')
    .max(255, 'La contraseña es muy larga'),
});

export const userSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(255, 'El nombre es muy largo')
    .trim(),
  email: z
    .string()
    .email('Email inválido')
    .max(255, 'El email es muy largo'),
  password: z
    .string()
    .min(3, 'La contraseña debe tener al menos 3 caracteres')
    .max(255, 'La contraseña es muy larga')
    .optional(),
  role: z.enum(['admin', 'user']),
  company_id: z.number().int().positive(),
  profile_photo: z.string().nullable().optional(),
});

export const attendanceSchema = z.object({
  type: z.enum(['check_in', 'lunch_out', 'lunch_in', 'check_out']),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  deviceInfo: z.string().max(500).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const absenceSchema = z.object({
  user_id: z.number().int().positive(),
  type: z.enum(['sick', 'vacation', 'personal', 'other']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  reason: z.string().max(1000).nullable().optional(),
  document_url: z.string().max(500).nullable().optional(),
});

export const reportFiltersSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  userId: z.number().int().positive().optional(),
  companyId: z.number().int().positive().optional(),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(255, 'El nombre es muy largo')
    .trim(),
  email: z
    .string()
    .email('Email inválido')
    .max(255, 'El email es muy largo'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(255, 'La contraseña es muy larga'),
  confirmPassword: z.string(),
  companyName: z
    .string()
    .min(1, 'El nombre de la empresa es requerido')
    .max(255, 'El nombre es muy largo'),
  role: z.enum(['admin', 'user']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

// Tipos inferidos de los esquemas (coinciden con PostgreSQL)
export type LoginInput = z.infer<typeof loginSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
export type AbsenceInput = z.infer<typeof absenceSchema>;
export type ReportFiltersInput = z.infer<typeof reportFiltersSchema>;