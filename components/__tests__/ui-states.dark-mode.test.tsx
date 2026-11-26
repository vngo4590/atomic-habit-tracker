import { render, screen, within } from "@testing-library/react";
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
  signOutEverywhereAction: vi.fn(),
  updateProfileAction: vi.fn(),
  changePasswordAction: vi.fn(),
}));

vi.mock("@/features/settings/actions", () => ({
  importDataAction: vi.fn(),
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
    expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe("145");
  });

  it("AppearanceSync maps a retired dark theme variant to Dark and saves it", () => {
    // Given: the server says light, but this browser remembered the retired Neon theme
    storeMock.preferences = { ...storeMock.preferences, theme: "light" as const };
    const storage = new Map<string, string>([["atomicly:theme-variant", "neon"]]);
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      writable: true,
      value: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
        removeItem: vi.fn((key: string) => storage.delete(key)),
        clear: vi.fn(() => storage.clear()),
      },
    });

    // When: AppearanceSync mounts
    render(<AppearanceSync />);

    // Then: the user lands on Dark (Neon's nearest supported look) and the
    // choice is saved to the server so every device agrees
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(storeMock.setPreferences).toHaveBeenCalledWith({ theme: "dark" });
    // And: the legacy key is cleaned up
    expect(window.localStorage.getItem("atomicly:theme-variant")).toBeNull();
  });

  it("Theme picker marks the active theme as selected", () => {
    // Given: the store is in light mode
    storeMock.preferences = { ...storeMock.preferences, theme: "light" as const };

    // When: the Settings page renders
    render(<SettingsPage />);

    // Then: "Light" is pressed and "Dark" is not
    const picker = screen.getByRole("group", { name: "Theme" });
    const light = within(picker).getByRole("button", { name: "Light" });
    const dark = within(picker).getByRole("button", { name: "Dark" });
    expect(light.getAttribute("aria-pressed")).toBe("true");
    expect(dark.getAttribute("aria-pressed")).toBe("false");
  });

  it("Accent color applies the CSS custom property to the document", () => {
    // Given: a custom accent hue
    const hue = 240;

    // When: applyAppearance is called directly
    applyAppearance("light", hue);

    // Then: the hue custom property is set (all accent tokens derive from it)
    expect(document.documentElement.style.getPropertyValue("--accent-hue")).toBe(String(hue));
  });
});

