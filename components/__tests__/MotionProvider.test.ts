import { afterEach, describe, expect, it, vi } from "vitest";

import { loadFeatures } from "@/components/motion/MotionProvider";

describe("MotionProvider loadFeatures", () => {
  afterEach(() => {
    document.documentElement.classList.remove("motion-unavailable");
  });

  it("retries once when the animation chunk fails to load", async () => {
    // Given a chunk load that fails once and then succeeds
    const features = { renderer: vi.fn() };
    const load = vi.fn().mockRejectedValueOnce(new Error("ChunkLoadError")).mockResolvedValueOnce(features);

    // When the features are loaded
    const result = await loadFeatures(load as never);

    // Then the retry's features are used and the page is not flagged
    expect(result).toBe(features);
    expect(load).toHaveBeenCalledTimes(2);
    expect(document.documentElement.classList.contains("motion-unavailable")).toBe(false);
  });

  it("flags the page so hidden elements become visible when the chunk never loads", async () => {
    // Given a chunk that keeps failing
    const load = vi.fn().mockRejectedValue(new Error("offline"));

    // When the features are loaded
    void loadFeatures(load as never);

    // Then it retries once and sets the CSS fallback class on <html>
    await vi.waitFor(() =>
      expect(document.documentElement.classList.contains("motion-unavailable")).toBe(true),
    );
    expect(load).toHaveBeenCalledTimes(2);
  });
});
