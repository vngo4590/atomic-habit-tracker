import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Renders the real MotionProvider while the lazily loaded animation chunk
// either keeps failing (offline / stale deploy) or never arrives (slow
// network), and checks the animated UI is still usable in both cases.
type ChunkMode = "fail" | "pending";

async function loadUi(mode: ChunkMode) {
  vi.resetModules();
  vi.doMock("@/components/motion/motion-features", () =>
    mode === "fail" ? Promise.reject(new Error("ChunkLoadError")) : new Promise(() => {}),
  );
  const { MotionProvider } = await import("@/components/motion/MotionProvider");
  const { OnboardingOverlay } = await import("@/components/OnboardingOverlay");
  const { Modal } = await import("@/components/Modal");
  return { MotionProvider, OnboardingOverlay, Modal };
}

async function renderOnboarding(mode: ChunkMode) {
  const { MotionProvider, OnboardingOverlay } = await loadUi(mode);
  const onComplete = vi.fn();
  render(
    <MotionProvider>
      <OnboardingOverlay onComplete={onComplete} />
    </MotionProvider>,
  );
  return onComplete;
}

async function renderModal(mode: ChunkMode) {
  const { MotionProvider, Modal } = await loadUi(mode);
  function Harness() {
    const [open, setOpen] = useState(true);
    return <Modal open={open} title="Stack not saved" message="Try again." onClose={() => setOpen(false)} />;
  }
  render(
    <MotionProvider>
      <Harness />
    </MotionProvider>,
  );
}

describe.each<ChunkMode>(["fail", "pending"])("MotionProvider when the animation chunk is %s", (mode) => {
  afterEach(() => {
    cleanup();
    vi.doUnmock("@/components/motion/motion-features");
    document.documentElement.classList.remove("motion-unavailable");
  });

  it("lets onboarding advance through every step and complete", async () => {
    // Given: onboarding is shown without animation features
    const onComplete = await renderOnboarding(mode);

    // When: the user steps through the tour
    fireEvent.click(screen.getByRole("button", { name: "Begin" }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start" }));

    // Then: onboarding completes
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("closes a modal without leaving its overlay mounted", async () => {
    // Given: an open modal without animation features
    await renderModal(mode);
    expect(screen.getByRole("dialog")).toBeTruthy();

    // When: the user acknowledges it
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    // Then: the dialog and its backdrop are gone
    await waitFor(() => expect(screen.queryByTestId("modal")).toBeNull());
  });
});
