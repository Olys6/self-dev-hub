import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color").notNull().default("accent"), // "accent" | "accent2" | "neutral"
  targetDate: text("target_date"), // ISO date, nullable — finite projects have one
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  kind: text("kind", { enum: ["gym", "cook", "project", "misc"] }).notNull(),
  date: text("date").notNull(), // ISO date, YYYY-MM-DD
  time: text("time"), // "HH:MM", null = all-day
  meta: text("meta"), // subtitle, e.g. "OpenGym · 48 min"
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  milestone: integer("milestone", { mode: "boolean" }).notNull().default(false),
  projectId: integer("project_id").references(() => projects.id),
  column: text("column", { enum: ["next", "doing", "done"] }), // kanban column, project tasks only
  source: text("source", { enum: ["manual", "mealie", "opengym"] }).notNull().default("manual"),
  externalId: text("external_id"), // id in the source system, for dedupe on re-sync
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});
