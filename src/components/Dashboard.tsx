"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Item, Project } from "@/lib/data";
import { deriveDashboard, KIND_COLOR, KIND_LABEL } from "@/lib/derive";
import { addDays, relativeDueLabel, toISODate } from "@/lib/dates";
import { dropItem, moveSlippedToToday, renameItem, rescheduleItem, toggleItemDone, updateItemSchedule } from "@/lib/actions";
import { FEATURES } from "@/lib/config";
import { ProjectPanel } from "./ProjectPanel";
import { CalendarPanel } from "./CalendarPanel";
import { RecordPanel } from "./RecordPanel";
import { QuickAddModal } from "./QuickAddModal";
import { NewProjectModal } from "./NewProjectModal";
import styles from "./dashboard.module.css";

const HUB_NAME = "Oly";
const PROJECT_BAR_COLOR: Record<string, string> = {
  accent: "var(--color-accent-500)",
  accent2: "var(--color-accent-2-500)",
  neutral: "var(--color-neutral-500)",
};

type Panel = { type: "project"; projectId: number } | { type: "calendar" } | { type: "record" } | null;

export function Dashboard({ items, projects, nowISO }: { items: Item[]; projects: Project[]; nowISO: string }) {
  const router = useRouter();
  const now = useMemo(() => new Date(nowISO), [nowISO]);
  const data = useMemo(() => deriveDashboard(items, projects, now), [items, projects, now]);

  const [, startTransition] = useTransition();
  const [panel, setPanel] = useState<Panel>(null);
  const [slippedOpen, setSlippedOpen] = useState(false);
  const [orbOpen, setOrbOpen] = useState(false);
  const [quickAddKind, setQuickAddKind] = useState<"gym" | "cook" | "project" | "misc" | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [pickingId, setPickingId] = useState<number | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");

  const weekItems = data.week.flatMap((d) => d.items);
  const weekGym = weekItems.filter((i) => i.kind === "gym");
  const weekGymDone = weekGym.filter((i) => i.done).length;
  const mealsPlanned = weekItems.filter((i) => i.kind === "cook").length;
  const openTasks = items.filter((i) => i.kind === "project" && i.column !== "done").length;

  function toggle(id: number) {
    startTransition(async () => {
      await toggleItemDone(id);
      router.refresh();
    });
  }
  function doToday(id: number) {
    startTransition(async () => {
      await moveSlippedToToday(id);
      router.refresh();
    });
  }
  function pick(id: number, date: string) {
    startTransition(async () => {
      await rescheduleItem(id, date);
      router.refresh();
    });
    setPickingId(null);
  }
  function drop(id: number) {
    startTransition(async () => {
      await dropItem(id);
      router.refresh();
    });
  }
  function saveSchedule(id: number, date: string, time: string) {
    setEditingScheduleId(null);
    startTransition(async () => {
      await updateItemSchedule(id, date, time || null);
      router.refresh();
    });
  }
  function saveTitle(id: number) {
    const title = editTitleValue.trim();
    setEditingTitleId(null);
    if (!title) return;
    startTransition(async () => {
      await renameItem(id, title);
      router.refresh();
    });
  }

  const slipWords = ["Nothing", "One thing", "Two things", "Three things", "Four things", "Five things"];
  const slippedTitle = `${slipWords[data.slipped.length] ?? data.slipped.length + " things"} slipped`;

  const activeProject =
    panel?.type === "project" ? projects.find((p) => p.id === panel.projectId) : null;
  const activeProjectTasks =
    panel?.type === "project"
      ? items.filter((i) => i.kind === "project" && i.projectId === panel.projectId)
      : [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.dateLabel}>{data.dateLabel}</div>
            <h1 className={styles.greeting}>
              {data.greeting} {HUB_NAME}.
            </h1>
          </div>
          <div className={styles.pills}>
            {FEATURES.gym && (
              <div className={styles.pill}>
                <span className={styles.pillValue}>{weekGymDone}</span>
                <span className={styles.pillLabel}>of {weekGym.length} sessions</span>
              </div>
            )}
            <div className={styles.pill}>
              <span className={styles.pillValue}>{mealsPlanned}</span>
              <span className={styles.pillLabel}>meals planned</span>
            </div>
            <div className={styles.pill}>
              <span className={styles.pillValue}>{openTasks}</span>
              <span className={styles.pillLabel}>open tasks</span>
            </div>
          </div>
        </header>

        <section className={styles.heroRow}>
          <div className={styles.hero}>
            <div className={styles.heroOrb} />
            <div className={styles.heroInner}>
              <div className={styles.heroKicker}>
                <span className={styles.heroDot} />
                <span className={styles.heroKickerText}>
                  Right now · {now.getHours().toString().padStart(2, "0")}:{now.getMinutes().toString().padStart(2, "0")}
                </span>
              </div>
              {data.hero ? (
                <>
                  <h2 className={styles.heroTitle}>{data.hero.title}</h2>
                  {data.hero.meta && <p className={styles.heroMeta}>{data.hero.meta}</p>}
                  <div className={styles.heroActions}>
                    <button className={`btn btn-primary ${styles.heroBtnPrimary}`} onClick={() => toggle(data.hero!.id)}>
                      Mark it done
                    </button>
                    <button
                      className={`btn ${styles.heroBtnSecondary}`}
                      onClick={() => pick(data.hero!.id, toISODate(addDays(now, 1)))}
                    >
                      Move to tomorrow
                    </button>
                  </div>
                </>
              ) : (
                <p className={styles.heroEmpty}>Nothing left open today. Good spot to be in.</p>
              )}
            </div>
          </div>

          <div className={styles.then}>
            <div className={styles.thenLabel}>Then</div>
            {data.nextUp.length === 0 && <div className={styles.emptyNote}>Nothing else queued.</div>}
            {data.nextUp.map((n) => (
              <div className={styles.thenRow} key={n.id}>
                <div className={styles.thenTime}>{n.time ?? relativeDueLabel(n.date)}</div>
                <div>
                  <div className={styles.thenTitle}>{n.title}</div>
                  {n.meta && <div className={styles.thenMeta}>{n.meta}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {data.slipped.length > 0 && (
          <section className={styles.slipped}>
            <div className={styles.slippedHeader}>
              <div className={styles.slippedLeft}>
                <div className={styles.slippedKicker}>Carried over</div>
                <div className={styles.slippedTitle}>{slippedTitle}</div>
                <div className={styles.slippedSub}>They are still here. Give one a time, or let it go.</div>
              </div>
              <button className={styles.slippedToggleBtn} onClick={() => setSlippedOpen((v) => !v)}>
                {slippedOpen ? "Hide" : "Look at them"}
              </button>
            </div>

            {slippedOpen && (
              <div className={styles.slippedList}>
                {data.slipped.map((s) => (
                  <div className={styles.slippedCard} key={s.id}>
                    <span className={styles.dot} style={{ background: KIND_COLOR[s.kind] }} />
                    <div className={styles.slippedInfo}>
                      <div className={styles.slippedInfoTitle}>{s.title}</div>
                      <div className={styles.slippedInfoMeta}>
                        {KIND_LABEL[s.kind]} · sitting here since {s.date}
                      </div>
                    </div>
                    {pickingId === s.id ? (
                      <input
                        className="input"
                        type="date"
                        autoFocus
                        style={{ maxWidth: 160 }}
                        onChange={(e) => e.target.value && pick(s.id, e.target.value)}
                        onBlur={() => setPickingId(null)}
                      />
                    ) : (
                      <div className={styles.slippedActions}>
                        <button className={styles.btnToday} onClick={() => doToday(s.id)}>
                          Do it today
                        </button>
                        <button className={styles.btnPick} onClick={() => setPickingId(s.id)}>
                          Pick a day
                        </button>
                        <button className={styles.btnDrop} onClick={() => drop(s.id)}>
                          Let it go
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className={styles.thread}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>The day, end to end</h3>
            <span className={styles.sectionSub}>
              {data.thread.filter((t) => t.done).length} of {data.thread.length} done
            </span>
          </div>
          <div className={styles.threadCard}>
            {data.thread.length === 0 && <div className={styles.emptyNote}>Nothing on the books today.</div>}
            {data.thread.map((t) => (
              <div className={styles.threadRow} key={t.id}>
                {editingScheduleId === t.id ? (
                  <div
                    className={styles.threadScheduleEdit}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        saveSchedule(t.id, editDate, editTime);
                      }
                    }}
                  >
                    <input
                      className="input"
                      type="date"
                      autoFocus
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveSchedule(t.id, editDate, editTime)}
                    />
                    <input
                      className="input"
                      type="time"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveSchedule(t.id, editDate, editTime)}
                    />
                  </div>
                ) : (
                  <div
                    className={styles.threadTime}
                    onClick={() => {
                      setEditingScheduleId(t.id);
                      setEditDate(t.date);
                      setEditTime(t.time ?? "");
                    }}
                  >
                    {t.time ?? "—"}
                  </div>
                )}
                <button
                  className={t.done ? styles.threadCheckDone : styles.threadCheck}
                  onClick={() => toggle(t.id)}
                  aria-label="Toggle done"
                >
                  {t.done && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </button>
                <div className={styles.threadBody}>
                  {editingTitleId === t.id ? (
                    <input
                      className="input"
                      autoFocus
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveTitle(t.id)}
                      onBlur={() => saveTitle(t.id)}
                    />
                  ) : (
                    <div
                      className={t.done ? styles.threadTitleDone : styles.threadTitle}
                      onClick={() => {
                        setEditingTitleId(t.id);
                        setEditTitleValue(t.title);
                      }}
                    >
                      {t.title}
                    </div>
                  )}
                  {t.meta && <div className={styles.threadMeta}>{t.meta}</div>}
                </div>
                <span className={styles.threadKind}>{KIND_LABEL[t.kind]}</span>
                <button className={styles.threadDelete} aria-label="Delete item" onClick={() => drop(t.id)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.projects}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Projects</h3>
            <button className={styles.sectionBtn} onClick={() => setNewProjectOpen(true)}>
              + New project
            </button>
          </div>
          <div className={styles.projectsGrid}>
            {data.projectCards.length === 0 && (
              <div className={styles.emptyNote}>No projects yet — add one to get a board.</div>
            )}
            {data.projectCards.map(({ project, total, done, doing, next }) => (
              <button
                key={project.id}
                className={styles.projectCard}
                onClick={() => setPanel({ type: "project", projectId: project.id })}
              >
                <div className={styles.projectHead}>
                  <span className={styles.dot} style={{ background: PROJECT_BAR_COLOR[project.color] }} />
                  <span className={styles.projectStatus}>{doing ? `${doing} in motion` : "Nothing in motion"}</span>
                </div>
                <h4 className={styles.projectName}>{project.name}</h4>
                <div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressBar}
                      style={{
                        width: total ? `${Math.round((done / total) * 100)}%` : "0%",
                        background: PROJECT_BAR_COLOR[project.color],
                      }}
                    />
                  </div>
                  <div className={styles.progressLabel}>{done} of {total} done</div>
                </div>
                <div className={styles.projectFoot}>
                  <span className={styles.projectNext}>{next ? next.title : "Nothing queued"}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.week}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>The next seven days</h3>
            <button className={styles.sectionBtn} onClick={() => setPanel({ type: "calendar" })}>
              Open the calendar
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <div className={styles.weekGrid}>
            {data.week.map((d) => (
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
        </section>

        <section className={styles.twoCol}>
          <div className={styles.panelCard}>
            <div className={styles.panelCardHeader}>
              <h4 className={styles.panelCardTitle}>This week&apos;s kitchen</h4>
              <span className={styles.panelCardTag}>Mealie</span>
            </div>
            <div className={styles.rowList}>
              {data.meals.length === 0 && <div className={styles.emptyPanelNote}>Nothing planned yet.</div>}
              {data.meals.map((m) => (
                <div className={styles.row} key={m.id}>
                  <span className={styles.rowDow}>{relativeDueLabel(m.date)}</span>
                  <span className={styles.rowName}>{m.title}</span>
                  {m.time && <span className={styles.rowTime}>{m.time}</span>}
                </div>
              ))}
            </div>
            <div className={styles.shoppingRow}>
              <span className={styles.shoppingText}>{data.shoppingCount} items on the plan this week</span>
            </div>
          </div>

          {FEATURES.gym && (
            <div className={styles.panelCard}>
              <div className={styles.panelCardHeader}>
                <h4 className={styles.panelCardTitle}>Training</h4>
                <span className={styles.panelCardTag}>OpenGym</span>
              </div>
              <div className={styles.trainingSub}>Synced manually until the OpenGym link is wired up</div>
              <div className={styles.rowList}>
                {data.sessions.length === 0 && <div className={styles.emptyPanelNote}>Nothing scheduled.</div>}
                {data.sessions.map((s) => (
                  <div className={styles.row} key={s.id}>
                    <span className={s.done ? styles.sessionMarkDone : styles.sessionMark} />
                    <span className={styles.rowName}>{s.title}</span>
                    <span className={styles.rowTime}>{s.time ?? relativeDueLabel(s.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className={styles.recordBand}>
          <div className={styles.recordLeft}>
            <div className={styles.recordKicker}>The record</div>
            <h3 className={styles.recordHeading}>
              {FEATURES.gym && `${data.doneCounts.gym} sessions. `}
              {data.doneCounts.cook} meals. {data.doneCounts.project} tasks closed.
            </h3>
            <p className={styles.recordSub}>Everything that&apos;s actually happened, not just planned.</p>
          </div>
          <button className={styles.recordBtn} onClick={() => setPanel({ type: "record" })}>
            Open the record
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </section>
      </div>

      {activeProject && (
        <ProjectPanel project={activeProject} tasks={activeProjectTasks} onClose={() => setPanel(null)} />
      )}
      {panel?.type === "calendar" && (
        <CalendarPanel items={items} week={data.week} now={now} onClose={() => setPanel(null)} />
      )}
      {panel?.type === "record" && <RecordPanel items={items} onClose={() => setPanel(null)} />}

      <div className={styles.orbWrap}>
        {orbOpen && (
          <div className={styles.orbShortcuts}>
            <button className={styles.orbShortcut} onClick={() => { setQuickAddKind("misc"); setOrbOpen(false); }}>
              <span className={styles.dot} style={{ background: KIND_COLOR.misc }} />
              Capture a thought
            </button>
            <button className={styles.orbShortcut} onClick={() => { setPanel({ type: "calendar" }); setOrbOpen(false); }}>
              <span className={styles.dot} style={{ background: KIND_COLOR.project }} />
              Open the calendar
            </button>
            {FEATURES.gym && (
              <button className={styles.orbShortcut} onClick={() => { setQuickAddKind("gym"); setOrbOpen(false); }}>
                <span className={styles.dot} style={{ background: KIND_COLOR.gym }} />
                Log a set
              </button>
            )}
            <button className={styles.orbShortcut} onClick={() => { setQuickAddKind("cook"); setOrbOpen(false); }}>
              <span className={styles.dot} style={{ background: KIND_COLOR.cook }} />
              Log tonight&apos;s meal
            </button>
          </div>
        )}
        <div className={styles.orbBar}>
          <button className={styles.orbAddLabel} onClick={() => setOrbOpen((v) => !v)}>
            Add
          </button>
          <button
            className={`${styles.orbButton} ${orbOpen ? styles.orbButtonOpen : ""}`}
            onClick={() => setOrbOpen((v) => !v)}
            aria-label="Toggle quick add"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      {quickAddKind && (
        <QuickAddModal defaultKind={quickAddKind} projects={projects} onClose={() => setQuickAddKind(null)} />
      )}
      {newProjectOpen && <NewProjectModal onClose={() => setNewProjectOpen(false)} />}
    </div>
  );
}
