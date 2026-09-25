"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Item, Project } from "@/lib/data";
import { relativeDueLabel } from "@/lib/dates";
import { addProjectTask, dropItem, moveTaskColumn, renameItem, rescheduleItem } from "@/lib/actions";
import { SlideOver } from "./SlideOver";
import styles from "./dashboard.module.css";

const COLS: { id: "next" | "doing" | "done"; name: string }[] = [
  { id: "next", name: "Up next" },
  { id: "doing", name: "In motion" },
  { id: "done", name: "Done this week" },
];

export function ProjectPanel({
  project,
  tasks,
  onClose,
}: {
  project: Project;
  tasks: Item[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [addingCol, setAddingCol] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editingDueId, setEditingDueId] = useState<number | null>(null);

  const open = tasks.filter((t) => t.column !== "done").length;
  const doing = tasks.filter((t) => t.column === "doing").length;
  const done = tasks.filter((t) => t.column === "done").length;
  const nextDeadline = [...tasks]
    .filter((t) => t.column !== "done")
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const stats = [
    { label: "Open", value: String(open) },
    { label: "In motion", value: String(doing) },
    { label: "Done", value: String(done) },
    { label: "Next deadline", value: nextDeadline ? relativeDueLabel(nextDeadline.date) : "—" },
  ];

  function move(id: number, column: "next" | "doing" | "done") {
    startTransition(async () => {
      await moveTaskColumn(id, column);
      router.refresh();
    });
    setDragId(null);
    setOverCol(null);
  }

  function addCard(column: "next" | "doing" | "done") {
    const title = newTitle.trim();
    if (!title) {
      setAddingCol(null);
      return;
    }
    startTransition(async () => {
      await addProjectTask({ projectId: project.id, title, column });
      router.refresh();
    });
    setNewTitle("");
    setAddingCol(null);
  }

  function saveRename(id: number) {
    const title = editTitle.trim();
    setEditingId(null);
    if (!title) return;
    startTransition(async () => {
      await renameItem(id, title);
      router.refresh();
    });
  }

  function saveDueDate(id: number, date: string) {
    setEditingDueId(null);
    startTransition(async () => {
      await rescheduleItem(id, date);
      router.refresh();
    });
  }

  function remove(id: number) {
    startTransition(async () => {
      await dropItem(id);
      router.refresh();
    });
  }

  return (
    <SlideOver kicker="Project" title={project.name} onClose={onClose}>
      <div className={styles.panelStats}>
        {stats.map((s) => (
          <div className={styles.panelStat} key={s.label}>
            <div className={styles.panelStatValue}>{s.value}</div>
            <div className={styles.panelStatLabel}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className={styles.kanbanHint}>Drag a card between columns</div>
      <div className={styles.kanbanColumns}>
        {COLS.map((col) => {
          const cards = tasks.filter((t) => t.column === col.id);
          return (
            <div
              key={col.id}
              className={`${styles.kanbanCol} ${overCol === col.id && dragId ? styles.kanbanColOver : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                if (overCol !== col.id) setOverCol(col.id);
              }}
              onDragLeave={() => {
                if (overCol === col.id) setOverCol(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) move(dragId, col.id);
              }}
            >
              <div className={styles.kanbanColHead}>
                <span className={styles.kanbanColName}>{col.name}</span>
                <span className={styles.kanbanColCount}>{cards.length}</span>
              </div>
              <div className={styles.kanbanCards}>
                {cards.map((card) => (
                  <div
                    key={card.id}
                    draggable={editingId !== card.id}
                    onDragStart={() => setDragId(card.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                    className={styles.kanbanCard}
                  >
                    <div className={styles.kanbanCardRow}>
                      {editingId === card.id ? (
                        <input
                          className="input"
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename(card.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onBlur={() => saveRename(card.id)}
                        />
                      ) : (
                        <div
                          className={styles.kanbanCardTitle}
                          onClick={() => {
                            setEditingId(card.id);
                            setEditTitle(card.title);
                          }}
                        >
                          {card.title}
                        </div>
                      )}
                      <button
                        className={styles.kanbanCardDelete}
                        aria-label="Delete card"
                        onClick={() => remove(card.id)}
                      >
                        ×
                      </button>
                    </div>
                    {col.id !== "done" &&
                      (editingDueId === card.id ? (
                        <input
                          className="input"
                          type="date"
                          autoFocus
                          style={{ marginTop: 8, maxWidth: 160 }}
                          defaultValue={card.date}
                          onChange={(e) => e.target.value && saveDueDate(card.id, e.target.value)}
                          onBlur={() => setEditingDueId(null)}
                        />
                      ) : (
                        <div
                          className={styles.kanbanCardDue}
                          onClick={() => setEditingDueId(card.id)}
                        >
                          {relativeDueLabel(card.date)}
                        </div>
                      ))}
                  </div>
                ))}
              </div>

              {addingCol === col.id ? (
                <div style={{ marginTop: 10 }}>
                  <input
                    className="input"
                    autoFocus
                    placeholder="Card title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addCard(col.id);
                      if (e.key === "Escape") {
                        setAddingCol(null);
                        setNewTitle("");
                      }
                    }}
                    onBlur={() => addCard(col.id)}
                  />
                </div>
              ) : (
                <button
                  className="btn btn-ghost"
                  style={{ marginTop: 10, width: "100%" }}
                  onClick={() => setAddingCol(col.id)}
                >
                  + Add a card
                </button>
              )}
            </div>
          );
        })}
      </div>
    </SlideOver>
  );
}
