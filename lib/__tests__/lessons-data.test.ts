import { describe, expect, it } from "vitest";

import { CHAPTERS, LESSONS, type Lesson } from "@/lib/lessons-data";

describe("Lessons data integrity", () => {
  it("contains 36 lessons in total", () => {
    // Then: the full curriculum has exactly 36 lessons
    expect(LESSONS).toHaveLength(36);
  });

  it("has sequential IDs from 1 to 36", () => {
    // When: we collect all IDs
    const ids = LESSONS.map((l: Lesson) => l.id);

    // Then: they form a continuous sequence without gaps or duplicates
    expect(ids).toEqual(Array.from({ length: 36 }, (_, i) => i + 1));
  });

  it("groups lessons into expected chapters", () => {
    // When: we look at the chapter list
    // Then: it contains exactly the expected chapter names in order
    expect(CHAPTERS).toEqual([
      "Foundations",
      "Identity",
      "1st Law · Make it obvious",
      "2nd Law · Make it attractive",
      "3rd Law · Make it easy",
      "4th Law · Make it satisfying",
      "Advanced",
      "Design",
      "Recovery",
      "Mastery",
    ]);
  });

  it("has every lesson in a recognized chapter", () => {
    // When: we check each lesson's chapter
    for (const lesson of LESSONS) {
      // Then: it belongs to one of the defined chapters
      expect(CHAPTERS).toContain(lesson.chapter);
    }
  });

  it("has required fields on every lesson", () => {
    // When: we inspect each lesson object
    for (const lesson of LESSONS) {
      // Then: it has all the fields the UI depends on
      expect(lesson.id, `Lesson ${lesson.id} missing id`).toBeTypeOf("number");
      expect(lesson.title, `Lesson ${lesson.id} missing title`).toBeTruthy();
      expect(lesson.quote, `Lesson ${lesson.id} missing quote`).toBeTruthy();
      expect(lesson.body, `Lesson ${lesson.id} missing body`).toBeTruthy();
      expect(lesson.takeaway, `Lesson ${lesson.id} missing takeaway`).toBeTruthy();
      expect(lesson.practice, `Lesson ${lesson.id} missing practice`).toBeTruthy();
      expect(lesson.minutes, `Lesson ${lesson.id} missing minutes`).toBeTypeOf("number");
      // And: the reading time is a reasonable small number (1–5 minutes)
      expect(lesson.minutes, `Lesson ${lesson.id} has unrealistic minutes`).toBeGreaterThanOrEqual(1);
      expect(lesson.minutes, `Lesson ${lesson.id} has unrealistic minutes`).toBeLessThanOrEqual(5);
    }
  });

  it("assigns every chapter at least one lesson", () => {
    // When: we count lessons per chapter
    const counts = new Map<string, number>();
    for (const lesson of LESSONS) {
      counts.set(lesson.chapter, (counts.get(lesson.chapter) ?? 0) + 1);
    }

    // Then: no chapter is empty
    for (const chapter of CHAPTERS) {
      expect(counts.get(chapter), `Chapter "${chapter}" has no lessons`).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps Foundations and Identity as the first two chapters", () => {
    // Then: the first two chapters are Foundations and Identity
    expect(CHAPTERS[0]).toBe("Foundations");
    expect(CHAPTERS[1]).toBe("Identity");
  });
});
