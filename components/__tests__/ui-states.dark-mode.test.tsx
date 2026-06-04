import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppearanceSync } from "@/components/AppearanceSync";
import SettingsPage from "@/app/(root)/settings/page";
import { applyAppearance } from "@/lib/appearance";
import {
  paramsMock,
  resetUiStateMocks,
  routerMock,
  storeMock,
  teardownUiStateDom,
} from "./_ui-states-helpers";

// vi.mock is only hoisted within the file that contains it, so each
// split file installs its own next/navigation + StoreProvider + auth
// action mocks.
vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/",
  useParams: () => paramsMock.current,
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

vi.mock("@/lib/actions/auth", () => ({
  logoutAction: vi.fn(),
  updateProfileAction: vi.fn(),
  changePasswordAction: vi.fn(),
}));

beforeEach(() => {
  resetUiStateMocks();
});

afterEach(() => {
  teardownUiStateDom();
});

describe("Dark Mode States", () => {
  it("AppearanceSync applies the data-theme attribute to the document", () => {
    // Given: the store preferences are set to dark mode with a custom accent
    storeMock.preferences = {
      ...storeMock.preferences,
      theme: "dark" as "light" | "dark",
      accentHue: 145,
    };

    // When: AppearanceSync mounts
    render(<AppearanceSync />);

    // Then: the document root reflects the theme and accent
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("oklch(62% 0.13 145)");
  });

  it("Theme gallery marks the active theme as selected", () => {
    // Given: the store is in light mode with no named variant stored
    storeMock.preferences = { ...storeMock.preferences, theme: "light" as const };

    // When: the Settings page renders
    render(<SettingsPage />);

    // Then: the light-based "Bright" card is pressed and "Midnight" is not
    const brightCard = screen.getByRole("button", { name: /Bright/ });
    const midnightCard = screen.getByRole("button", { name: /Midnight/ });
    expect(brightCard.getAttribute("aria-pressed")).toBe("true");
    expect(midnightCard.getAttribute("aria-pressed")).toBe("false");
  });

  it("Accent color applies the CSS custom property to the document", () => {
    // Given: a custom accent hue
    const hue = 240;

    // When: applyAppearance is called directly
    applyAppearance("light", hue);

    // Then: the CSS custom properties are set
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe(`oklch(62% 0.13 ${hue})`);
    expect(document.documentElement.style.getPropertyValue("--accent-2")).toBe(`oklch(72% 0.10 ${hue})`);
  });
});

