"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { createItem } from "@/lib/actions";
import { FEATURES } from "@/lib/config";
import styles from "./dashboard.module.css";

const ALL_KIND_OPTIONS: { value: "gym" | "cook" | "project" | "misc"; label: string }[] = [
  { value: "misc", label: "Capture a thought" },
  { value: "gym", label: "Log a set" },
  { value: "cook", label: "Log tonight's meal" },
  { value: "project", label: "Project task" },
];
const KIND_OPTIONS = ALL_KIND_OPTIONS.filter((o) => o.value !== "gym" || FEATURES.gym);

export function QuickAddModal({
  defaultKind,
  projects,
  onClose,
}: {
  defaultKind: "gym" | "cook" | "project" | "misc";
  projects: Project[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState(defaultKind);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [projectId, setProjectId] = useState<number | "">(projects[0]?.id ?? "");

  function submit() {
    if (!title.trim()) return;
    startTransition(async () => {
      await createItem({
        title: title.trim(),
        kind,
        date,
        time: time || null,
        projectId: kind === "project" && projectId !== "" ? Number(projectId) : null,
      });
      router.refresh();
      onClose();
    });
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>Add something</h3>

        <div className="field">
          <label>What is it?</label>
          <input
            className="input"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
          />
        </div>

        <div className="field">
          <label>Kind</label>
          <select
            className="input"
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {kind === "project" && (
          <div className="field">
            <label>Project</label>
            <select
              className="input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : "")}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.modalRow}>
          <div className="field" style={{ flex: 1 }}>
            <label>Date</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Time (optional)</label>
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div className={styles.modalActions}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={isPending || !title.trim()}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
