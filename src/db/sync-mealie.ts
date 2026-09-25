process.loadEnvFile(".env.local");

import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "./index";
import { items } from "./schema";
import { addDays, toISODate } from "../lib/dates";
import { fetchMealPlan, mealieEntryToItem } from "../lib/mealie";

const SYNC_DAYS_AHEAD = 13;

async function main() {
  const today = new Date();
  const start = toISODate(today);
  const end = toISODate(addDays(today, SYNC_DAYS_AHEAD));

  const entries = await fetchMealPlan(start, end);

  await db
    .delete(items)
    .where(and(eq(items.kind, "cook"), eq(items.source, "mealie"), gte(items.date, start), lte(items.date, end)));

  if (entries.length > 0) {
    await db.insert(items).values(
      entries.map((e) => ({
        ...mealieEntryToItem(e),
        kind: "cook" as const,
        source: "mealie" as const,
      }))
    );
  }

  console.log(`Synced ${entries.length} Mealie meal plan entries (${start} to ${end}).`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
