import { db } from "./index";
import { items, projects } from "./schema";
import { addDays, toISODate } from "../lib/dates";

async function main() {
  await db.delete(items);
  await db.delete(projects);

  const today = new Date();
  const iso = (offset: number) => toISODate(addDays(today, offset));

  const [room] = await db
    .insert(projects)
    .values({ name: "Room declutter", color: "neutral", targetDate: iso(45) })
    .returning();

  const [hub] = await db
    .insert(projects)
    .values({ name: "Self-Dev Hub build", color: "accent2" })
    .returning();

  await db.insert(items).values([
    // Room declutter tasks (kanban)
    { title: "Box up old textbooks", kind: "project", projectId: room.id, column: "done", date: iso(-6), done: true },
    { title: "Take a carload to the charity shop", kind: "project", projectId: room.id, column: "done", date: iso(-3), done: true },
    { title: "Clear the desk drawers", kind: "project", projectId: room.id, column: "doing", date: iso(2) },
    { title: "Sort cables and old chargers", kind: "project", projectId: room.id, column: "next", date: iso(5) },
    { title: "Decide on the wardrobe", kind: "project", projectId: room.id, column: "next", date: iso(10) },

    // Self-Dev Hub build tasks (kanban)
    { title: "Confirm Mealie API is reachable", kind: "project", projectId: hub.id, column: "done", date: iso(-10), done: true },
    { title: "Confirm Open Gym API is usable", kind: "project", projectId: hub.id, column: "done", date: iso(-8), done: true },
    { title: "Hub dashboard skeleton", kind: "project", projectId: hub.id, column: "doing", date: iso(0) },
    { title: "Activity log ingestion from spokes", kind: "project", projectId: hub.id, column: "next", date: iso(14) },
    { title: "MCP read-only review layer", kind: "project", projectId: hub.id, column: "next", date: iso(28) },

    // Gym — past (some done, one slipped) and upcoming
    { title: "Pull day, session 2", kind: "gym", date: iso(-2), meta: "OpenGym · missed", done: false },
    { title: "Leg day", kind: "gym", date: iso(-1), meta: "OpenGym · 52 min", done: true },
    { title: "Push day, session 3", kind: "gym", date: iso(0), time: "17:40", meta: "OpenGym · 48 min · chest, shoulders, triceps" },
    { title: "Pull day, session 4", kind: "gym", date: iso(1), time: "18:00", meta: "OpenGym · closes week 3", milestone: false },
    { title: "Leg day", kind: "gym", date: iso(3), time: "18:00", meta: "OpenGym" },
    { title: "Upper accessory", kind: "gym", date: iso(5), time: "07:30", meta: "OpenGym" },
    { title: "First 100kg bench", kind: "gym", date: iso(-1), meta: "OpenGym · milestone", done: true, milestone: true },

    // Cooking — this week's plan + one slipped shop
    { title: "Migrate Mealie to Postgres", kind: "cook", date: iso(-4), meta: "Home server · sitting here since last week", done: false },
    { title: "Overnight oats, berries", kind: "cook", date: iso(0), time: "08:00", meta: "Mealie · prepped last night", done: true },
    { title: "Order groceries for this week", kind: "cook", date: iso(0), time: "14:00", meta: "Mealie · 11 items est." },
    { title: "Miso salmon rice bowls", kind: "cook", date: iso(0), time: "19:15", meta: "Mealie · 35 min · serves 2" },
    { title: "Chickpea and squash traybake", kind: "cook", date: iso(1), time: "19:30", meta: "Mealie · 45 min" },
    { title: "Green curry with tofu", kind: "cook", date: iso(2), time: "19:30", meta: "Mealie · 30 min" },
    { title: "Shoyu ramen, soft egg", kind: "cook", date: iso(3), time: "19:30", meta: "Mealie · 50 min" },
    { title: "Leftovers, big salad", kind: "cook", date: iso(4), time: "19:00", meta: "Mealie · 10 min" },

    // Misc / day-thread filler
    { title: "Wireframe the work page", kind: "project", projectId: hub.id, column: "doing", date: iso(0), time: "10:30", meta: "Self-Dev Hub · 90 min block" },
    { title: "Case study draft", kind: "misc", date: iso(0), time: "21:00", meta: "Due tomorrow 09:00" },
  ]);

  console.log("Seeded.");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
