import type { Item } from "./data";

const KIND_LABEL: Record<Item["kind"], string> = {
  gym: "Gym",
  cook: "Kitchen",
  project: "Project",
  misc: "Misc",
};

const DEFAULT_DURATION_MIN = 30;
// Timed events are emitted in the container's local zone (set via TZ in docker-compose).
const TZID = process.env.TZ || "UTC";

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

// RFC 5545 requires folding lines longer than 75 octets, continuation lines
// start with a single space.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

function dateStamp(iso: string): string {
  return iso.replace(/-/g, "");
}

function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function nowUTCStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function eventLines(item: Item): string[] {
  const summary = escapeText(`${item.title}`);
  const descriptionParts = [KIND_LABEL[item.kind]];
  if (item.meta) descriptionParts.push(item.meta);
  const description = escapeText(descriptionParts.join(" · "));
  const uid = `item-${item.id}@hub.example.com`;

  const lines = ["BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${nowUTCStamp()}`];

  if (item.time) {
    const start = `${dateStamp(item.date)}T${item.time.replace(":", "")}00`;
    const [h, m] = item.time.split(":").map(Number);
    const endMinutes = h * 60 + m + DEFAULT_DURATION_MIN;
    const endH = String(Math.floor(endMinutes / 60) % 24).padStart(2, "0");
    const endM = String(endMinutes % 60).padStart(2, "0");
    const endDateIso = endMinutes >= 24 * 60 ? addDaysISO(item.date, 1) : item.date;
    const end = `${dateStamp(endDateIso)}T${endH}${endM}00`;
    lines.push(`DTSTART;TZID=${TZID}:${start}`, `DTEND;TZID=${TZID}:${end}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${dateStamp(item.date)}`, `DTEND;VALUE=DATE:${dateStamp(addDaysISO(item.date, 1))}`);
  }

  lines.push(`SUMMARY:${summary}`);
  if (description) lines.push(`DESCRIPTION:${description}`);
  lines.push("END:VEVENT");
  return lines;
}

export function buildICS(items: Item[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//self-dev-hub//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Hub",
  ];
  for (const item of items) {
    lines.push(...eventLines(item));
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
