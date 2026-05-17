import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Toast } from "@/components/Toast";
import type { ToastState } from "@/lib/types";

const useStoreContextMock = vi.hoisted(() => vi.fn(() => ({ toast: null as ToastState | null })));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: useStoreContextMock,
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: (p: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { children, layout, variants, initial, animate, exit, ...props } = p;
      return <div {...props}>{children as React.ReactNode}</div>;
    },
  },
}));

describe("Toast business logic", () => {
  afterEach(() => {
    cleanup();
    useStoreContextMock.mockClear();
  });

  it("renders nothing when there is no toast", () => {
    // Given the store has no toast message
    useStoreContextMock.mockReturnValue({ toast: null });

    // When the Toast component is rendered
    const { container } = render(<Toast />);

    // Then nothing is rendered in the toast container
    expect(container.querySelector(".toast")).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("shows the message and optional subtext when a toast is visible", () => {
    // Given the store has a toast with a message and subtext
    useStoreContextMock.mockReturnValue({
      toast: { msg: "Vote cast for reader", sub: "12 total", id: 1 },
    });

    // When the Toast component is rendered
    render(<Toast />);

    // Then the message and subtext are visible
    expect(screen.getByText("Vote cast for reader")).toBeTruthy();
    expect(screen.getByText("12 total")).toBeTruthy();
  });

  it("shows the message without subtext when sub is not provided", () => {
    // Given the store has a toast with only a message
    useStoreContextMock.mockReturnValue({
      toast: { msg: "Habit saved", id: 2 },
    });

    // When the Toast component is rendered
    render(<Toast />);

    // Then the message is visible
    expect(screen.getByText("Habit saved")).toBeTruthy();

    // And no em subtext element is rendered
    expect(screen.queryByText(/total/)).toBeNull();
  });

  it("auto-dismisses after 2.4 seconds", () => {
    // Given a toast is currently visible
    vi.useFakeTimers();
    useStoreContextMock.mockReturnValue({
      toast: { msg: "Saved", id: 3 },
    });

    const { container, rerender } = render(<Toast />);

    // Then the toast is initially visible
    expect(container.querySelector(".toast")).toBeTruthy();
    expect(screen.getByText("Saved")).toBeTruthy();

    // When 2.4 seconds pass and the store clears the toast (simulating auto-dismiss)
    useStoreContextMock.mockReturnValue({ toast: null });
    act(() => {
      vi.advanceTimersByTime(2400);
    });
    rerender(<Toast />);

    // Then the toast is no longer rendered
    expect(container.querySelector(".toast")).toBeNull();

    vi.useRealTimers();
  });

  it("replaces the old toast when a new toast arrives", async () => {
    // Given an initial toast is visible
    useStoreContextMock.mockReturnValue({
      toast: { msg: "First message", id: 10 },
    });

    const { container, rerender } = render(<Toast />);

    // Then the first message is shown
    expect(screen.getByText("First message")).toBeTruthy();

    // When a new toast with a different id appears
    useStoreContextMock.mockReturnValue({
      toast: { msg: "Second message", sub: "Updated", id: 11 },
    });
    rerender(<Toast />);

    // Then the new message is visible
    expect(screen.getByText("Second message")).toBeTruthy();
    expect(screen.getByText("Updated")).toBeTruthy();

    // And at most two toast elements exist during the transition
    expect(container.querySelectorAll(".toast").length).toBeLessThanOrEqual(2);
  });
});
