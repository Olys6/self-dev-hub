// Dependency-light mirror of src/db/sync-mealie.ts + src/lib/mealie.ts —
// same reasoning as scripts/migrate.mjs: only better-sqlite3 (a real
// node_modules entry) is available inside the standalone container, so this
// avoids drizzle-orm and talks to Mealie with native fetch directly.
import Database from "better-sqlite3";
import path from "node:path";

const SYNC_DAYS_AHEAD = 13;

const ENTRY_TIME = {
  breakfast: "08:00",
  lunch: "12:30",
  dinner: "19:00",
  side: null,
};

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

async function fetchMealPlan(startDate, endDate) {
  const base = process.env.MEALIE_BASE_URL;
  const token = process.env.MEALIE_API_TOKEN;
  if (!base || !token) throw new Error("MEALIE_BASE_URL / MEALIE_API_TOKEN not set");
  const url = `${base}/api/households/mealplans?start_date=${startDate}&end_date=${endDate}&perPage=100`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Mealie meal plan fetch failed: ${res.status} ${await res.text()}`);
  const body = await res.json();
  return body.items;
}

function entryToItem(entry) {
  const title = entry.recipe?.name || entry.title || entry.text || "Meal";
  const metaParts = [`Mealie · ${entry.entryType}`];
  if (entry.recipe?.totalTime) metaParts.push(entry.recipe.totalTime);
  return {
    title,
    date: entry.date,
    time: ENTRY_TIME[entry.entryType] ?? null,
    meta: metaParts.join(" · "),
    externalId: String(entry.id),
  };
}

async function main() {
  const today = new Date();
  const start = toISODate(today);
  const end = toISODate(addDays(today, SYNC_DAYS_AHEAD));

  const entries = await fetchMealPlan(start, end);

  const db = new Database(path.join(process.cwd(), "data", "hub.db"));
  db.pragma("journal_mode = WAL");

  const del = db.prepare(
    "DELETE FROM items WHERE kind = 'cook' AND source = 'mealie' AND date >= ? AND date <= ?"
  );
  const insert = db.prepare(
    `INSERT INTO items (title, kind, date, time, meta, source, external_id)
     VALUES (@title, 'cook', @date, @time, @meta, 'mealie', @externalId)`
  );

  const run = db.transaction((rows) => {
    del.run(start, end);
    for (const row of rows) insert.run(row);
  });
  run(entries.map(entryToItem));

  console.log(`Synced ${entries.length} Mealie meal plan entries (${start} to ${end}).`);
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
