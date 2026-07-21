import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  date,
  time,
  jsonb,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Clients
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  phoneNormalized: varchar("phone_normalized", { length: 30 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("clients_phone_normalized_idx").on(table.phoneNormalized),
]);

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 20 }).notNull(),
  price: integer("price"),
  priceMax: integer("price_max"),
  priceLabel: varchar("price_label", { length: 100 }).notNull(),
  duration: integer("duration").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("services_name_idx").on(table.name),
  index("services_category_active_idx").on(table.category, table.active),
  check("services_category_check", sql`${table.category} in ('lashes', 'nails', 'extras')`),
  check("services_duration_check", sql`${table.duration} > 0`),
  check("services_price_check", sql`${table.price} is null or ${table.price} >= 0`),
]);

// Technicians
export const technicians = pgTable("technicians", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 20 }).notNull(),
  slotType: varchar("slot_type", { length: 10 }).notNull().default("range"),
  availableDays: jsonb("available_days").$type<number[]>().notNull().default([]),
  startTime: time("start_time"),
  endTime: time("end_time"),
  slotInterval: integer("slot_interval").default(60),
  fixedSlots: jsonb("fixed_slots").$type<string[]>(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  check("technicians_category_check", sql`${table.category} in ('lashes', 'nails')`),
  check("technicians_slot_type_check", sql`${table.slotType} in ('range', 'fixed')`),
  check("technicians_slot_interval_check", sql`${table.slotInterval} is null or ${table.slotInterval} between 5 and 480`),
]);

// Blocked dates
export const blockedDates = pgTable("blocked_dates", {
  id: serial("id").primaryKey(),
  technicianId: integer("technician_id").references(() => technicians.id).notNull(),
  blockedDate: date("blocked_date").notNull(),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("blocked_dates_technician_date_idx").on(table.technicianId, table.blockedDate),
]);

// Bookings
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "restrict" }).notNull(),
  serviceId: integer("service_id").references(() => services.id, { onDelete: "restrict" }).notNull(),
  technicianId: integer("technician_id").references(() => technicians.id).notNull(),
  clientName: varchar("client_name", { length: 200 }).notNull(),
  clientPhone: varchar("client_phone", { length: 50 }).notNull(),
  service: varchar("service", { length: 200 }).notNull(),
  extras: jsonb("extras").$type<string[]>().default([]),
  price: integer("price"),           // price in EGP, null if variable
  priceIsEstimate: boolean("price_is_estimate").notNull().default(false),
  bookingDate: date("booking_date").notNull(),
  bookingTime: time("booking_time").notNull(),
  duration: integer("duration").default(60), // minutes
  status: varchar("status", { length: 30 }).notNull().default("pending_deposit"),
  policyAcknowledged: boolean("policy_acknowledged").notNull().default(false),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  managementTokenHash: varchar("management_token_hash", { length: 64 }).unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("bookings_technician_date_idx").on(table.technicianId, table.bookingDate),
  index("bookings_status_date_idx").on(table.status, table.bookingDate),
  index("bookings_date_time_idx").on(table.bookingDate, table.bookingTime),
  index("bookings_client_id_idx").on(table.clientId),
  index("bookings_service_id_idx").on(table.serviceId),
  uniqueIndex("bookings_active_slot_idx")
    .on(table.technicianId, table.bookingDate, table.bookingTime)
    .where(sql`${table.status} in ('pending_deposit', 'confirmed')`),
  check("bookings_status_check", sql`${table.status} in ('pending_deposit', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled')`),
  check("bookings_duration_check", sql`${table.duration} is null or ${table.duration} > 0`),
  check("bookings_price_check", sql`${table.price} is null or ${table.price} >= 0`),
]);

// Admin users
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").notNull().default(true),
  sessionVersion: integer("session_version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// One shared, read-only login for the technician calendar portal.
export const technicianPortalUsers = pgTable("technician_portal_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").notNull().default(true),
  sessionVersion: integer("session_version").notNull().default(1),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rateLimits = pgTable("rate_limits", {
  key: varchar("key", { length: 255 }).primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});
