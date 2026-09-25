"use client";

import { useMemo } from "react";
import type { Item } from "@/lib/data";
import { buildRecord, KIND_COLOR } from "@/lib/derive";
import { FEATURES } from "@/lib/config";
import { SlideOver } from "./SlideOver";
import styles from "./dashboard.module.css";

const RAMP: Record<"gym" | "cook" | "project", string[]> = {
  gym: ["var(--color-neutral-300)", "var(--color-accent-200)", "var(--color-accent-400)", "var(--color-accent-600)"],
  cook: ["var(--color-neutral-300)", "var(--color-accent-2-200)", "var(--color-accent-2-400)", "var(--color-accent-2-600)"],
  project: ["var(--color-neutral-300)", "var(--color-neutral-400)", "var(--color-neutral-600)", "var(--color-neutral-800)"],
};

export function RecordPanel({ items, onClose }: { items: Item[]; onClose: () => void }) {
  const record = useMemo(() => buildRecord(items), [items]);
  const milestones = useMemo(
    () =>
      items
        .filter((i) => i.milestone)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 8),
    [items]
  );

  return (
    <SlideOver kicker={`Since ${record.since}`} title="The record" onClose={onClose}>
      {record.rows.filter((r) => r.kind !== "gym" || FEATURES.gym).map((r) => (
        <div className={styles.recordRow} key={r.kind}>
          <div className={styles.recordRowHead}>
            <span className={styles.recordTotal}>{r.total}</span>
            <span className={styles.recordRowLabel}>{r.label}</span>
          </div>
          <div className={styles.heatmap}>
            {r.counts.map((n, i) => {
              const lvl = n === 0 ? 0 : Math.min(3, Math.ceil((n / r.max) * 3));
              return <div key={i} className={styles.heatCell} style={{ background: RAMP[r.kind][lvl] }} />;
            })}
          </div>
        </div>
      ))}

      <div className={styles.milestoneCard}>
        <div className={styles.milestoneKicker}>Milestones</div>
        {milestones.length === 0 && <div className={styles.emptyPanelNote}>None flagged yet.</div>}
        {milestones.map((m) => (
          <div className={styles.milestoneRow} key={m.id}>
            <span className={styles.dot} style={{ background: KIND_COLOR[m.kind] }} />
            <span className={styles.milestoneTitle}>{m.title}</span>
            <span className={styles.milestoneDate}>{m.date}</span>
          </div>
        ))}
      </div>
    </SlideOver>
  );
}
