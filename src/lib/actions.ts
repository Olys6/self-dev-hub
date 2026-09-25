"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { items, projects } from "@/db/schema";
import { todayISO } from "./dates";

export async function toggleItemDone(id: number) {
  const [current] = await db.select().from(items).where(eq(items.id, id));
  if (!current) return;
  const done = !current.done;
  await db
    .update(items)
    .set({ done, column: current.kind === "project" && current.column ? (done ? "done" : "doing") : current.column })
    .where(eq(items.id, id));
  revalidatePath("/");
}

export async function moveTaskColumn(id: number, column: "next" | "doing" | "done") {
  await db
    .update(items)
    .set({ column, done: column === "done" })
    .where(eq(items.id, id));
  revalidatePath("/");
}

export async function moveSlippedToToday(id: number) {
  await db.update(items).set({ date: todayISO() }).where(eq(items.id, id));
  revalidatePath("/");
}

export async function rescheduleItem(id: number, date: string) {
  await db.update(items).set({ date }).where(eq(items.id, id));
  revalidatePath("/");
}

export async function updateItemSchedule(id: number, date: string, time: string | null) {
  await db.update(items).set({ date, time: time || null }).where(eq(items.id, id));
  revalidatePath("/");
}

export async function dropItem(id: number) {
  await db.delete(items).where(eq(items.id, id));
  revalidatePath("/");
}

export async function renameItem(id: number, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return;
  await db.update(items).set({ title: trimmed }).where(eq(items.id, id));
  revalidatePath("/");
}

export async function addProjectTask(input: {
  projectId: number;
  title: string;
  column: "next" | "doing" | "done";
}) {
  await db.insert(items).values({
    title: input.title,
    kind: "project",
    projectId: input.projectId,
    column: input.column,
    date: todayISO(),
    done: input.column === "done",
  });
  revalidatePath("/");
}

export async function createProject(input: {
  name: string;
  color: "accent" | "accent2" | "neutral";
  targetDate?: string | null;
}) {
  const name = input.name.trim();
  if (!name) return;
  await db.insert(projects).values({
    name,
    color: input.color,
    targetDate: input.targetDate || null,
  });
  revalidatePath("/");
}

export async function deleteProject(id: number) {
  await db.delete(items).where(and(eq(items.kind, "project"), eq(items.projectId, id)));
  await db.delete(projects).where(eq(projects.id, id));
  revalidatePath("/");
}

export async function createItem(input: {
  title: string;
  kind: "gym" | "cook" | "project" | "misc";
  date: string;
  time?: string | null;
  meta?: string | null;
  projectId?: number | null;
}) {
  await db.insert(items).values({
    title: input.title,
    kind: input.kind,
    date: input.date,
    time: input.time ?? null,
    meta: input.meta ?? null,
    projectId: input.projectId ?? null,
    column: input.kind === "project" ? "next" : null,
  });
  revalidatePath("/");
}
