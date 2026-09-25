import type { Item, Project } from "./data";
import {
  addDays,
  currentTimeHM,
  dowShort,
  fullDateLabel,
  greeting,
  startOfWeek,
  toISODate,
  todayISO,
} from "./dates";

export const KIND_LABEL: Record<Item["kind"], string> = {
  gym: "Gym",
  cook: "Kitchen",
  project: "Project",
  misc: "Misc",
};

export const KIND_COLOR: Record<Item["kind"], string> = {
  gym: "var(--color-accent-500)",
  cook: "var(--color-accent-2-500)",
  project: "var(--color-neutral-500)",
  misc: "var(--color-neutral-400)",
};

export function deriveDashboard(allItems: Item[], allProjects: Project[], now: Date) {
  const today = todayISO();
  const nowHM = currentTimeHM(now);

  const thread = allItems
    .filter((i) => i.date === today)
    .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));

  const openToday = thread.filter((i) => !i.done);
  const timedOpenToday = openToday.filter((i): i is Item & { time: string } => !!i.time);
  const hero =
    [...timedOpenToday].reverse().find((i) => i.time <= nowHM) ??
    timedOpenToday[0] ??
    openToday.find((i) => !i.time) ??
    null;

  const sortedUpcoming = [...allItems]
    .filter((i) => !i.done && i.id !== hero?.id)
    .sort((a, b) => (a.date + (a.time ?? "99:99")).localeCompare(b.date + (b.time ?? "99:99")))
    .filter((i) => i.date > today || (i.date === today && (i.time ?? "") > (hero?.time ?? "")));

  const nextUp = sortedUpcoming.slice(0, 3);

  const slipped = allItems
    .filter((i) => !i.done && i.date < today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const weekStart = startOfWeek(now);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const iso = toISODate(d);
    return {
      iso,
      dow: dowShort(d),
      n: d.getDate(),
      isToday: iso === today,
      items: allItems.filter((it) => it.date === iso),
    };
  });

  const projectCards = allProjects.map((p) => {
    const tasks = allItems.filter((i) => i.kind === "project" && i.projectId === p.id);
    const done = tasks.filter((t) => t.column === "done").length;
    const doing = tasks.filter((t) => t.column === "doing").length;
    const next = tasks.find((t) => t.column === "doing") ?? tasks.find((t) => t.column === "next");
    return { project: p, total: tasks.length, done, doing, next };
  });

  const meals = allItems
    .filter((i) => i.kind === "cook" && i.date >= today)
    .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))
    .slice(0, 5);

  const sessions = allItems
    .filter((i) => i.kind === "gym" && i.date >= today)
    .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))
    .slice(0, 4);

  const shoppingCount = allItems.filter(
    (i) => i.kind === "cook" && !i.done && i.date >= today
  ).length;

  const doneCounts = { gym: 0, cook: 0, project: 0 };
  for (const i of allItems) {
    if (i.done && i.kind !== "misc") doneCounts[i.kind]++;
  }

  const milestones = allItems
    .filter((i) => i.milestone)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);

  return {
    dateLabel: fullDateLabel(now),
    greeting: greeting(now),
    thread,
    hero,
    nextUp,
    slipped,
    week,
    projectCards,
    meals,
    sessions,
    shoppingCount,
    doneCounts,
    milestones,
  };
}

const RECORD_LABEL: Record<"gym" | "cook" | "project", string> = {
  gym: "Sessions trained",
  cook: "Meals cooked",
  project: "Tasks closed",
};

export function buildRecord(allItems: Item[], weeksBack = 15) {
  const now = new Date();
  const thisWeekStart = startOfWeek(now);
  const weekStarts = Array.from({ length: weeksBack }, (_, i) =>
    addDays(thisWeekStart, -(weeksBack - 1 - i) * 7)
  );

  const kinds: ("gym" | "cook" | "project")[] = ["gym", "cook", "project"];
  const rows = kinds.map((k) => {
    const counts = weekStarts.map((ws) => {
      const we = addDays(ws, 6);
      const wsIso = toISODate(ws);
      const weIso = toISODate(we);
      return allItems.filter(
        (i) => i.kind === k && i.done && i.date >= wsIso && i.date <= weIso
      ).length;
    });
    const total = counts.reduce((a, b) => a + b, 0);
    const max = Math.max(1, ...counts);
    return { kind: k, label: RECORD_LABEL[k], total, counts, max };
  });

  const oldestIso = toISODate(weekStarts[0]);
  return { rows, since: oldestIso };
}

export function buildMonthGrid(allItems: Item[], year: number, month: number) {
  const start = new Date(year, month, 1);
  const gridStart = startOfWeek(start);
  const today = todayISO();
  return Array.from({ length: 42 }, (_, i) => {
    const d = addDays(gridStart, i);
    const iso = toISODate(d);
    return {
      date: d,
      iso,
      n: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: iso === today,
      items: allItems.filter((it) => it.date === iso),
    };
  });
}

export function buildAgenda(allItems: Item[], days: number) {
  const today = todayISO();
  const upcoming = new Map<string, Item[]>();
  for (const i of allItems) {
    if (i.date < today) continue;
    if (!upcoming.has(i.date)) upcoming.set(i.date, []);
    upcoming.get(i.date)!.push(i);
  }
  return Array.from(upcoming.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, days)
    .map(([iso, its]) => {
      const [y, m, d] = iso.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return {
        iso,
        n: date.getDate(),
        dow: dowShort(date),
        items: its.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")),
      };
    });
}
