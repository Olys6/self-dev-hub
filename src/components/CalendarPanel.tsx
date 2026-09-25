"use client";

import { useMemo, useState } from "react";
import type { Item } from "@/lib/data";
import { buildAgenda, buildMonthGrid, KIND_COLOR } from "@/lib/derive";
import { SlideOver } from "./SlideOver";
import styles from "./dashboard.module.css";

type View = "week" | "month" | "agenda";
type WeekDay = { iso: string; dow: string; n: number; isToday: boolean; items: Item[] };

const DOWS = ["M", "T", "W", "T", "F", "S", "S"];

export function CalendarPanel({
  items,
  week,
  now,
  onClose,
}: {
  items: Item[];
  week: WeekDay[];
  now: Date;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>("week");

  const month = useMemo(
    () => buildMonthGrid(items, now.getFullYear(), now.getMonth()),
    [items, now]
  );
  const agenda = useMemo(() => buildAgenda(items, 7), [items]);

  return (
    <SlideOver kicker={now.toLocaleDateString(undefined, { month: "long", year: "numeric" })} title="Everything with a date on it" onClose={onClose}>
      <div className={styles.viewTabs}>
        {(["week", "month", "agenda"] as View[]).map((v) => (
          <button
            key={v}
            className={`${styles.viewTab} ${view === v ? styles.viewTabActive : ""}`}
            onClick={() => setView(v)}
          >
            {v[0].toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {view === "week" && (
        <div className={styles.weekGrid}>
          {week.map((d) => (
            <div key={d.iso} className={`${styles.dayBox} ${d.isToday ? styles.dayBoxToday : ""}`}>
              <div className={styles.dayDow}>{d.dow}</div>
              <div className={styles.dayNum}>{d.n}</div>
              <div className={styles.dayItems}>
                {d.items.map((it) => (
                  <div key={it.id} className={styles.dayItem}>
                    <span className={styles.dayItemDot} style={{ background: KIND_COLOR[it.kind] }} />
                    <span>{it.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "month" && (
        <div className={styles.monthGrid}>
          <div className={styles.monthDows}>
            {DOWS.map((d, i) => (
              <div key={i} className={styles.monthDow}>{d}</div>
            ))}
          </div>
          <div className={styles.monthCells}>
            {month.map((c) => (
              <div
                key={c.iso}
                className={`${styles.monthCell} ${!c.inMonth ? styles.monthCellOut : ""} ${c.isToday ? styles.monthCellToday : ""}`}
              >
                <span className={`${styles.monthNum} ${!c.inMonth ? styles.monthNumOut : ""}`}>{c.n}</span>
                <div className={styles.monthDots}>
                  {c.items.slice(0, 3).map((it) => (
                    <span key={it.id} className={styles.monthDot} style={{ background: KIND_COLOR[it.kind] }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "agenda" && (
        <div className={styles.agenda}>
          {agenda.length === 0 && <div className={styles.emptyPanelNote}>Nothing scheduled.</div>}
          {agenda.map((a) => (
            <div key={a.iso} className={styles.agendaRow}>
              <div className={styles.agendaDate}>
                <div className={styles.agendaDow}>{a.dow}</div>
                <div className={styles.agendaNum}>{a.n}</div>
              </div>
              <div className={styles.agendaItems}>
                {a.items.map((it) => (
                  <div key={it.id} className={styles.agendaItem}>
                    <span className={styles.dayItemDot} style={{ background: KIND_COLOR[it.kind] }} />
                    <span className={styles.agendaLabel}>{it.title}</span>
                    <span className={styles.agendaTime}>{it.time ?? "All day"}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SlideOver>
  );
}
