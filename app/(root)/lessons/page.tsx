"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerContainer";
import { useStoreContext } from "@/components/StoreProvider";
import { CHAPTERS, LESSONS, type Lesson } from "@/lib/lessons-data";

type View = "home" | "reader" | "library";
type Mode = "sequential" | "random";

export function pickToday(completed: Set<number>, mode: Mode, date = new Date()) {
  if (mode === "sequential") {
    return LESSONS.find((lesson) => !completed.has(lesson.id)) ?? LESSONS[0];
  }

  const key = Number(`${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`);
  return LESSONS[key % LESSONS.length];
}

export default function LessonsPage() {
  const { completedLessons: completed, lessonMode: mode, setLessonMode, markLessonRead } = useStoreContext();
  const [view, setView] = useState<View>("home");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Lesson>(() => pickToday(completed, mode));
  const [modePulse, setModePulse] = useState<Mode | null>(null);
  const todayLesson = useMemo(() => pickToday(completed, mode), [completed, mode]);

  const openLesson = (lesson: Lesson) => {
    setSelected(lesson);
    setView("reader");
  };

  const markRead = (lesson: Lesson) => {
    markLessonRead(lesson.id);
  };

  const chooseMode = (item: Mode) => {
    setLessonMode(item);
    setModePulse(null);
    window.setTimeout(() => setModePulse(item), 0);
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
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}>
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
              <div className="lesson-mode-switch">
                {(["sequential", "random"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`chip lesson-mode-chip ${mode === item ? "active" : ""} ${modePulse === item ? "pulse" : ""}`}
                    aria-pressed={mode === item}
                    onAnimationEnd={() => setModePulse((current) => (current === item ? null : current))}
                    onClick={() => chooseMode(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <motion.button className="btn btn-primary" onClick={() => openLesson(todayLesson)} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>Read lesson</motion.button>
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
          <motion.button className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => markRead(selected)} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
            {completed.has(selected.id) ? "Read" : "I've read this"}
          </motion.button>
        </section>
      )}

      {view === "library" && (
        <>
          <div className="tabs" style={{ marginBottom: 18 }}>
            {["All", "Unread", ...CHAPTERS].map((item) => (
              <button key={item} className={`tab ${filter === item ? "active" : ""}`} onClick={() => setFilter(item)}>{item}</button>
            ))}
          </div>
          <StaggerContainer style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }} staggerDelay={0.04}>
            {filteredLessons.map((lesson) => (
              <StaggerItem key={lesson.id}>
                <motion.button className="card card-pad click-row" style={{ textAlign: "left" }} onClick={() => openLesson(lesson)} whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <div className="eyebrow">{lesson.chapter}</div>
                <h2 className="h3" style={{ marginTop: 8 }}>{lesson.title}</h2>
                <p className="muted" style={{ lineHeight: 1.45 }}>{lesson.takeaway}</p>
                <span className="chip">{completed.has(lesson.id) ? "Read" : `${lesson.minutes} min`}</span>
                </motion.button>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </>
      )}
    </motion.div>
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
