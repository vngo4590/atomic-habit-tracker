"use client";

import { useMemo, useState } from "react";

import { CHAPTERS, LESSONS, type Lesson } from "@/lib/lessons-data";

const STORAGE_KEY = "atomicly:lessons";
type View = "home" | "reader" | "library";
type Mode = "sequential" | "random";

function readCompleted() {
  if (typeof window === "undefined") {
    return new Set<number>();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const ids = raw ? (JSON.parse(raw) as number[]) : [];
    return new Set(ids);
  } catch {
    return new Set<number>();
  }
}

function persistCompleted(completed: Set<number>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(completed).sort((a, b) => a - b)));
}

export function pickToday(completed: Set<number>, mode: Mode, date = new Date()) {
  if (mode === "sequential") {
    return LESSONS.find((lesson) => !completed.has(lesson.id)) ?? LESSONS[0];
  }

  const key = Number(`${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`);
  return LESSONS[key % LESSONS.length];
}

export default function LessonsPage() {
  const [completed, setCompleted] = useState<Set<number>>(() => readCompleted());
  const [mode, setMode] = useState<Mode>("sequential");
  const [view, setView] = useState<View>("home");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Lesson>(() => pickToday(readCompleted(), "sequential"));
  const todayLesson = useMemo(() => pickToday(completed, mode), [completed, mode]);

  const openLesson = (lesson: Lesson) => {
    setSelected(lesson);
    setView("reader");
  };

  const markRead = (lesson: Lesson) => {
    setCompleted((current) => {
      const next = new Set(current);
      next.add(lesson.id);
      persistCompleted(next);
      return next;
    });
  };

  const filteredLessons = LESSONS.filter((lesson) => {
    if (filter === "Unread") {
      return !completed.has(lesson.id);
    }
    if (filter === "All") {
      return true;
    }
    return lesson.chapter === filter;
  });

  const progress = Math.round((completed.size / LESSONS.length) * 100);

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="eyebrow">Learn</div>
          <h1 className="h1">Daily <em>lessons</em></h1>
        </div>
        <div className="tabs" style={{ borderBottom: "none", margin: 0 }}>
          {(["home", "library"] as const).map((item) => (
            <button key={item} className={`tab ${view === item ? "active" : ""}`} onClick={() => setView(item)}>
              {item === "home" ? "Today" : "Library"}
            </button>
          ))}
        </div>
      </div>

      {view === "home" && (
        <>
          <section className="card card-pad" style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
              <div>
                <div className="eyebrow">Today&apos;s lesson · {todayLesson.minutes} min</div>
                <h2 className="h2" style={{ marginTop: 8 }}>{todayLesson.title}</h2>
                <p className="lede" style={{ maxWidth: 680 }}>{todayLesson.takeaway}</p>
              </div>
              <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
                {(["sequential", "random"] as const).map((item) => (
                  <button key={item} className={`chip ${mode === item ? "active" : ""}`} onClick={() => setMode(item)}>{item}</button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => openLesson(todayLesson)}>Read lesson</button>
          </section>
          <CurriculumMap completed={completed} todayId={todayLesson.id} />
          <div className="muted mono" style={{ marginTop: 12, fontSize: 11 }}>{completed.size} / {LESSONS.length} read · {progress}%</div>
        </>
      )}

      {view === "reader" && (
        <section className="card card-pad">
          <button className="btn btn-sm" onClick={() => setView("home")}>Back</button>
          <div className="eyebrow" style={{ marginTop: 18 }}>{selected.chapter} · {selected.minutes} min</div>
          <h2 className="h1" style={{ marginTop: 8 }}>{selected.title}</h2>
          <p style={{ fontFamily: "var(--serif)", fontSize: 24, fontStyle: "italic", color: "var(--accent)", lineHeight: 1.35 }}>&quot;{selected.quote}&quot;</p>
          <p className="lede" style={{ lineHeight: 1.65 }}>{selected.body}</p>
          <div className="card card-pad" style={{ background: "var(--bg-sunk)", marginTop: 16 }}>
            <div className="eyebrow">Practice</div>
            <p style={{ margin: "8px 0 0" }}>{selected.practice}</p>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => markRead(selected)}>
            {completed.has(selected.id) ? "Read" : "I've read this"}
          </button>
        </section>
      )}

      {view === "library" && (
        <>
          <div className="tabs" style={{ marginBottom: 18 }}>
            {["All", "Unread", ...CHAPTERS].map((item) => (
              <button key={item} className={`tab ${filter === item ? "active" : ""}`} onClick={() => setFilter(item)}>{item}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {filteredLessons.map((lesson) => (
              <button key={lesson.id} className="card card-pad click-row" style={{ textAlign: "left" }} onClick={() => openLesson(lesson)}>
                <div className="eyebrow">{lesson.chapter}</div>
                <h2 className="h3" style={{ marginTop: 8 }}>{lesson.title}</h2>
                <p className="muted" style={{ lineHeight: 1.45 }}>{lesson.takeaway}</p>
                <span className="chip">{completed.has(lesson.id) ? "Read" : `${lesson.minutes} min`}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CurriculumMap({ completed, todayId }: { completed: Set<number>; todayId: number }) {
  return (
    <section className="card card-pad">
      <div className="eyebrow">Curriculum map</div>
      <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
        {CHAPTERS.map((chapter) => {
          const lessons = LESSONS.filter((lesson) => lesson.chapter === chapter);
          return (
            <div key={chapter} style={{ display: "grid", gridTemplateColumns: "170px 1fr", alignItems: "center", gap: 14 }}>
              <div className="muted" style={{ fontSize: 12 }}>{chapter}</div>
              <div style={{ display: "flex", gap: 6 }}>
                {lessons.map((lesson) => (
                  <span
                    key={lesson.id}
                    title={lesson.title}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: completed.has(lesson.id) ? "var(--accent)" : "var(--bg-sunk)",
                      border: lesson.id === todayId ? "2px solid var(--ink)" : "1px solid var(--rule)",
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
