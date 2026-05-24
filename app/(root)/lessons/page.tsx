"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerContainer";
import { useStoreContext } from "@/components/StoreProvider";
import { CHAPTERS, LESSONS, type Lesson } from "@/lib/lessons-data";

import styles from "./page.module.css";

type View = "home" | "reader" | "library";
type Mode = "sequential" | "random";

/** Pick today's lesson based on mode (sequential = next unread, random
 *  = a stable shuffle based on the current date). */
export function pickToday(completed: Set<number>, mode: Mode, date = new Date()) {
  if (mode === "sequential") {
    return LESSONS.find((lesson) => !completed.has(lesson.id)) ?? LESSONS[0];
  }
  const key = Number(`${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`);
  return LESSONS[key % LESSONS.length];
}

/**
 * LessonsPage — the 36-lesson curriculum. Three views:
 *   - home: today's lesson + curriculum map.
 *   - reader: full lesson with quote, body, and a practice prompt.
 *   - library: all lessons in a 3-up grid, filterable by chapter.
 */
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
    // Re-trigger the pulse animation by clearing then setting on the
    // next tick. The chip listens for animationend to reset the modifier.
    setModePulse(null);
    window.setTimeout(() => setModePulse(item), 0);
  };

  const filteredLessons = LESSONS.filter((lesson) => {
    if (filter === "Unread") return !completed.has(lesson.id);
    if (filter === "All") return true;
    return lesson.chapter === filter;
  });

  const progress = Math.round((completed.size / LESSONS.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="page-header">
        <div>
          <div className="eyebrow">Learn</div>
          <h1 className="h1">Daily <em>lessons</em></h1>
        </div>
        <div className={`tabs ${styles.headerTabs}`}>
          {(["home", "library"] as const).map((item) => (
            <button key={item} className={`tab ${view === item ? "active" : ""}`} onClick={() => setView(item)}>
              {item === "home" ? "Today" : "Library"}
            </button>
          ))}
        </div>
      </div>

      {view === "home" && (
        <>
          <section className={`card card-pad ${styles.heroCard}`}>
            <div className={styles.heroRow}>
              <div>
                <div className="eyebrow">Today&apos;s lesson · {todayLesson.minutes} min</div>
                <h2 className={`h2 ${styles.heroTitle}`}>{todayLesson.title}</h2>
                <p className={`lede ${styles.heroLede}`}>{todayLesson.takeaway}</p>
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
            <motion.button className="btn btn-primary" onClick={() => openLesson(todayLesson)} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
              Read lesson
            </motion.button>
          </section>
          <CurriculumMap completed={completed} todayId={todayLesson.id} />
          <div className={`muted mono ${styles.progressCaption}`}>
            {completed.size} / {LESSONS.length} read · {progress}%
          </div>
        </>
      )}

      {view === "reader" && (
        <section className="card card-pad">
          <button className="btn btn-sm" onClick={() => setView("home")}>Back</button>
          <div className={`eyebrow ${styles.readerEyebrow}`}>
            {selected.chapter} · {selected.minutes} min
          </div>
          <h2 className={`h1 ${styles.readerTitle}`}>{selected.title}</h2>
          <p className={styles.readerQuote}>&quot;{selected.quote}&quot;</p>
          <p className={`lede ${styles.readerBody}`}>{selected.body}</p>
          <div className={`card card-pad ${styles.practiceCard}`}>
            <div className="eyebrow">Practice</div>
            <p className={styles.practiceBody}>{selected.practice}</p>
          </div>
          <motion.button
            className={`btn btn-primary ${styles.readerCta}`}
            onClick={() => markRead(selected)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            {completed.has(selected.id) ? "Read" : "I've read this"}
          </motion.button>
        </section>
      )}

      {view === "library" && (
        <>
          <div className={`tabs ${styles.libraryTabs}`}>
            {["All", "Unread", ...CHAPTERS].map((item) => (
              <button key={item} className={`tab ${filter === item ? "active" : ""}`} onClick={() => setFilter(item)}>
                {item}
              </button>
            ))}
          </div>
          <StaggerContainer className={styles.libraryGrid} staggerDelay={0.04}>
            {filteredLessons.map((lesson) => (
              <StaggerItem key={lesson.id}>
                <motion.button
                  className={`card card-pad click-row ${styles.lessonCard}`}
                  onClick={() => openLesson(lesson)}
                  whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="eyebrow">{lesson.chapter}</div>
                  <h2 className={`h3 ${styles.lessonCardTitle}`}>{lesson.title}</h2>
                  <p className={`muted ${styles.lessonCardLede}`}>{lesson.takeaway}</p>
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

/** CurriculumMap — overview of all 36 lessons grouped by chapter. Each
 *  lesson is a dot; filled = read, outlined = today, muted = unread. */
function CurriculumMap({ completed, todayId }: { completed: Set<number>; todayId: number }) {
  return (
    <section className="card card-pad">
      <div className="eyebrow">Curriculum map</div>
      <div className={styles.curriculumList}>
        {CHAPTERS.map((chapter) => {
          const lessons = LESSONS.filter((lesson) => lesson.chapter === chapter);
          return (
            <div key={chapter} className={styles.chapterRow}>
              <div className={`muted ${styles.chapterLabel}`}>{chapter}</div>
              <div className={styles.chapterDots}>
                {lessons.map((lesson) => (
                  <span
                    key={lesson.id}
                    title={lesson.title}
                    className={styles.lessonDot}
                    // Lesson dot styling is data-driven. Pass the colours
                    // through as CSS variables so .lessonDot stays generic.
                    style={
                      {
                        "--dot-bg": completed.has(lesson.id) ? "var(--accent)" : "var(--bg-sunk)",
                        "--dot-border": lesson.id === todayId ? "2px solid var(--ink)" : "1px solid var(--rule)",
                      } as React.CSSProperties
                    }
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
