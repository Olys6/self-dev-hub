const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Monday-indexed weekday: 0 = Mon ... 6 = Sun */
export function isoWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function dowShort(d: Date): string {
  return DOW[isoWeekday(d)];
}

export function fullDateLabel(d: Date): string {
  const weekday = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][isoWeekday(d)];
  return `${weekday} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "Morning.";
  if (h < 18) return "Afternoon.";
  return "Evening.";
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function startOfWeek(d: Date): Date {
  return addDays(d, -isoWeekday(d));
}

export function currentTimeHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function relativeDueLabel(dateISO: string, todayIso = todayISO()): string {
  if (dateISO === todayIso) return "Today";
  const [ty, tm, td] = todayIso.split("-").map(Number);
  const [dy, dm, dd] = dateISO.split("-").map(Number);
  const diffDays = Math.round(
    (Date.UTC(dy, dm - 1, dd) - Date.UTC(ty, tm - 1, td)) / 86_400_000
  );
  if (diffDays < 0) return "Overdue";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) {
    const d = new Date(dy, dm - 1, dd);
    return dowShort(d);
  }
  const d = new Date(dy, dm - 1, dd);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}
