import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { testStoreContext } from "@/lib/test/fixtures";

const storeMock = vi.hoisted(() => ({
  value: null as ReturnType<typeof testStoreContext> | null,
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock.value,
}));

import LessonsPage, { pickToday } from "@/app/(root)/lessons/page";
import { LESSONS } from "@/lib/lessons-data";

describe("LessonsPage", () => {
  beforeEach(() => {
    vi.useRealTimers();
    storeMock.value = testStoreContext();
  });

  it("picks the first unread lesson in sequential mode", () => {
    expect(pickToday(new Set([1, 2]), "sequential").id).toBe(3);
    expect(pickToday(new Set(LESSONS.map((lesson) => lesson.id)), "sequential").id).toBe(1);
  });

  it("picks a stable daily lesson in random mode", () => {
    const date = new Date(2030, 0, 2);

    expect(pickToday(new Set(), "random", date)).toEqual(pickToday(new Set([1, 2, 3]), "random", date));
  });

  it("exposes selected lesson mode and pulses the clicked control", async () => {
    vi.useFakeTimers();
    const setLessonMode = vi.fn();
    storeMock.value = testStoreContext({ lessonMode: "sequential", setLessonMode });

    render(<LessonsPage />);

    const sequential = screen.getByRole("button", { name: "sequential" });
    const random = screen.getByRole("button", { name: "random" });
    expect(sequential.getAttribute("aria-pressed")).toBe("true");
    expect(random.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(random);
    expect(setLessonMode).toHaveBeenCalledWith("random");

    await act(async () => {
      vi.runOnlyPendingTimers();
    });
    expect(random.className).toContain("pulse");
  });
});
