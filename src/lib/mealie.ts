export type MealieMealPlanEntry = {
  id: number;
  date: string;
  entryType: "breakfast" | "lunch" | "dinner" | "side";
  title: string;
  text: string;
  recipe: { name: string; totalTime: string | null } | null;
};

const ENTRY_TIME: Record<MealieMealPlanEntry["entryType"], string | null> = {
  breakfast: "08:00",
  lunch: "12:30",
  dinner: "19:00",
  side: null,
};

export function mealieConfigured(): boolean {
  return !!(process.env.MEALIE_BASE_URL && process.env.MEALIE_API_TOKEN);
}

export async function fetchMealPlan(startDate: string, endDate: string): Promise<MealieMealPlanEntry[]> {
  const base = process.env.MEALIE_BASE_URL;
  const token = process.env.MEALIE_API_TOKEN;
  if (!base || !token) {
    throw new Error("MEALIE_BASE_URL / MEALIE_API_TOKEN not set");
  }
  const url = `${base}/api/households/mealplans?start_date=${startDate}&end_date=${endDate}&perPage=100`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Mealie meal plan fetch failed: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body.items;
}

export function mealieEntryToItem(entry: MealieMealPlanEntry) {
  const title = entry.recipe?.name || entry.title || entry.text || "Meal";
  const metaParts = [`Mealie · ${entry.entryType}`];
  if (entry.recipe?.totalTime) metaParts.push(entry.recipe.totalTime);
  return {
    title,
    date: entry.date,
    time: ENTRY_TIME[entry.entryType],
    meta: metaParts.join(" · "),
    externalId: String(entry.id),
  };
}
