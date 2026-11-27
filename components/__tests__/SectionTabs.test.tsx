import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InsightsTabs, ReflectTabs } from "@/components/nav/SectionTabs";
import nextConfig from "@/next.config";

const usePathnameMock = vi.hoisted(() => vi.fn(() => "/journal"));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

afterEach(() => {
  cleanup();
});

describe("Section hub tabs", () => {
  it("links Journal and Weekly review under Reflect, marking the current page", () => {
    // Given: the user is on the weekly review
    usePathnameMock.mockReturnValue("/review");

    // When: the Reflect tab row renders
    render(<ReflectTabs />);

    // Then: both sibling pages are linked and Weekly review is current
    const nav = screen.getByRole("navigation", { name: "Reflect sections" });
    expect(within(nav).getByRole("link", { name: "Journal" }).getAttribute("href")).toBe("/journal");
    const review = within(nav).getByRole("link", { name: "Weekly review" });
    expect(review.getAttribute("aria-current")).toBe("page");
    expect(within(nav).getByRole("link", { name: "Journal" }).hasAttribute("aria-current")).toBe(false);
  });

  it("links Analytics and Hall of Fame under Insights", () => {
    // Given: the user is on the Hall of Fame
    usePathnameMock.mockReturnValue("/hall-of-fame");

    // When: the Insights tab row renders
    render(<InsightsTabs />);

    // Then: Hall of Fame is current and Analytics is one tap away
    const nav = screen.getByRole("navigation", { name: "Insights sections" });
    expect(within(nav).getByRole("link", { name: "Analytics" }).getAttribute("href")).toBe("/analytics");
    expect(within(nav).getByRole("link", { name: "Hall of Fame" }).getAttribute("aria-current")).toBe("page");
  });
});

describe("Hub redirects", () => {
  it("sends /reflect to Journal and /insights to Analytics with a temporary redirect", async () => {
    // Given/When: Next reads the configured redirects
    const redirects = await nextConfig.redirects?.();

    // Then: both hub URLs land on their first tab, without a cached 308
    expect(redirects).toEqual(
      expect.arrayContaining([
        { source: "/reflect", destination: "/journal", permanent: false },
        { source: "/insights", destination: "/analytics", permanent: false },
      ]),
    );
  });
});
