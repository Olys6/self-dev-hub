import { eq } from "drizzle-orm";
import { db } from "@/db";
import { items, projects } from "@/db/schema";

export type Item = typeof items.$inferSelect;
export type Project = typeof projects.$inferSelect;

export async function getAllData() {
  const [allProjects, allItems] = await Promise.all([
    db.select().from(projects).where(eq(projects.archived, false)),
    db.select().from(items),
  ]);
  return { projects: allProjects, items: allItems };
}
