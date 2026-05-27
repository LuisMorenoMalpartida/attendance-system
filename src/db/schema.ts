import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  date,
  time,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";

/* =========================
   ENUMS
========================= */

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "user",
]);

export const attendanceTypeEnum = pgEnum("attendance_type", [
  "check_in",
  "lunch_out",
  "lunch_in",
  "check_out",
]);

export const absenceTypeEnum = pgEnum("absence_type", [
  "sick",
  "vacation",
  "personal",
  "other",
]);

export const absenceStatusEnum = pgEnum("absence_status", [
  "pending",
  "approved",
  "rejected",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "reminder",
  "alert",
  "info",
  "warning",
]);

/* =========================
   COMPANIES
========================= */

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),

  name: varchar("name", {
    length: 255,
  }).notNull(),

  createdAt: timestamp("created_at")
    .defaultNow(),
});

/* =========================
   USERS
========================= */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  name: varchar("name", {
    length: 255,
  })
    .notNull(),

  email: varchar("email", {
    length: 255,
  })
    .notNull()
    .unique(),

  passwordHash: varchar("password_hash", {
    length: 255,
  }).notNull(),

  role: userRoleEnum("role")
    .default("user"),

  companyId: integer("company_id")
    .references(() => companies.id),

  profilePhoto: text("profile_photo"),

  isActive: boolean("is_active")
    .default(true),

  createdAt: timestamp("created_at")
    .defaultNow(),
});

/* =========================
   WORK SCHEDULES
========================= */

export const workSchedules = pgTable("work_schedules", {
  id: serial("id").primaryKey(),

  userId: integer("user_id")
    .references(() => users.id),

  dayOfWeek: integer("day_of_week"),

  startTime: time("start_time")
    .notNull(),

  endTime: time("end_time")
    .notNull(),

  toleranceMinutes: integer("tolerance_minutes")
    .default(15),

  isActive: boolean("is_active")
    .default(true),

  createdAt: timestamp("created_at")
    .defaultNow(),
});

/* =========================
   ATTENDANCE RECORDS
========================= */

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: serial("id").primaryKey(),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id),

    type: attendanceTypeEnum("type"),

    timestamp: timestamp("timestamp")
      .notNull(),

    latitude: decimal("latitude", {
      precision: 10,
      scale: 8,
    }),

    longitude: decimal("longitude", {
      precision: 11,
      scale: 8,
    }),

    deviceInfo: text("device_info"),

    notes: text("notes"),

    isManual: boolean("is_manual")
      .default(false),

    modifiedBy: integer("modified_by")
      .references(() => users.id),

    createdAt: timestamp("created_at")
      .defaultNow(),
  }
);

/* =========================
   ABSENCES
========================= */

export const absences = pgTable("absences", {
  id: serial("id").primaryKey(),

  userId: integer("user_id")
    .notNull()
    .references(() => users.id),

  type: absenceTypeEnum("type"),

  startDate: date("start_date")
    .notNull(),

  endDate: date("end_date")
    .notNull(),

  reason: text("reason"),

  documentUrl: text("document_url"),

  status: absenceStatusEnum("status")
    .default("pending"),

  approvedBy: integer("approved_by")
    .references(() => users.id),

  createdAt: timestamp("created_at")
    .defaultNow(),
});

/* =========================
   NOTIFICATIONS
========================= */

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),

    userId: integer("user_id")
      .references(() => users.id),

    title: varchar("title", {
      length: 255,
    }).notNull(),

    message: text("message")
      .notNull(),

    type: notificationTypeEnum("type"),

    isRead: boolean("is_read")
      .default(false),

    createdAt: timestamp("created_at")
      .defaultNow(),
  }
);

/* =========================
   TYPES
========================= */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Company = typeof companies.$inferSelect;

export type AttendanceRecord =
  typeof attendanceRecords.$inferSelect;

export type Absence =
  typeof absences.$inferSelect;

export type Notification =
  typeof notifications.$inferSelect;