"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/lib/actions";
import styles from "./dashboard.module.css";

const COLOR_OPTIONS: { value: "accent" | "accent2" | "neutral"; label: string; swatch: string }[] = [
  { value: "accent", label: "Orange", swatch: "var(--color-accent-500)" },
  { value: "accent2", label: "Olive", swatch: "var(--color-accent-2-500)" },
  { value: "neutral", label: "Neutral", swatch: "var(--color-neutral-500)" },
];

export function NewProjectModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [color, setColor] = useState<"accent" | "accent2" | "neutral">("accent");
  const [targetDate, setTargetDate] = useState("");

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createProject({ name: name.trim(), color, targetDate: targetDate || null });
      router.refresh();
      onClose();
    });
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>New project</h3>

        <div className="field">
          <label>Name</label>
          <input
            className="input"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. Room declutter"
          />
        </div>

        <div className="field">
          <label>Colour</label>
          <div style={{ display: "flex", gap: 8 }}>
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  gap: 8,
                  boxShadow: color === c.value ? "inset 0 0 0 2px var(--color-text)" : undefined,
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.swatch, display: "block" }} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Target date (optional)</label>
          <input className="input" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>

        <div className={styles.modalActions}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={isPending || !name.trim()}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
