import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Nav } from "@/components/Nav";
import type { Habit } from "@/lib/types";

const routerPushMock = vi.hoisted(() => vi.fn());
const usePathnameMock = vi.hoisted(() => vi.fn(() => "/"));
const useRouterMock = vi.hoisted(() => vi.fn(() => ({ push: routerPushMock })));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useRouter: useRouterMock,
}));

const useStoreContextMock = vi.hoisted(() => vi.fn(() => ({ habits: [] as Habit[] })));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: useStoreContextMock,
}));

vi.mock("@/lib/actions/auth", () => ({
  logoutAction: vi.fn(),
}));

const ALICE = { name: "Alice", email: "alice@example.com" };

/** Minimal habit with the given completion history (each key is one vote). */
function makeHabit(id: string, history: Record<string, boolean>): Habit {
  return {
    id,
    name: id,
    emoji: "•",
    cue: "",
    craving: "",
    response: "",
    reward: "",
    loopCue: "",
    loopCraving: "",
    loopResponse: "",
    loopReward: "",
    twoMin: "",
    identity: "reader",
    environment: "",
    schedule: "Daily",
    time: "Morning",
    contract: "",
    contractPartners: [],
    history,
    notes: [],
    createdAt: "2024-01-01",
  };
}

/** The desktop sidebar's destination list. */
const sidebarNav = () => screen.getByRole("navigation", { name: "Main navigation" });
/** The mobile bottom tab bar. */
const tabBar = () => screen.getByRole("navigation", { name: "Primary" });
/** Labels of the links currently marked aria-current="page" inside a nav. */
const currentLabels = (nav: HTMLElement) =>
  within(nav)
    .getAllByRole("link")
    .filter((link) => link.getAttribute("aria-current") === "page")
    .map((link) => link.textContent?.replace(/.$/, "").trim() ?? "");

beforeEach(() => {
  routerPushMock.mockClear();
  usePathnameMock.mockReturnValue("/");
  useStoreContextMock.mockReturnValue({ habits: [] as Habit[] });
});

afterEach(() => {
  cleanup();
});

describe("Nav — information architecture", () => {
  it("lists the six ADR-0003 destinations in the sidebar", () => {
    // Given/When: the nav renders
    render(<Nav user={ALICE} />);

    // Then: the sidebar offers exactly the new top-level sections, in order
    const hrefs = within(sidebarNav())
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["/", "/habits", "/journal", "/analytics", "/pet", "/settings"]);
    for (const name of ["Today", "Habits", "Reflect", "Insights", "Pet", "Settings"]) {
      expect(within(sidebarNav()).getByRole("link", { name: new RegExp(`^${name}`) })).toBeTruthy();
    }
    // And: the retired groups/labels are gone
    expect(screen.queryByText("Practice")).toBeNull();
    expect(screen.queryByText("All habits")).toBeNull();
  });

  it("puts 'New habit' as the sidebar's primary action", () => {
    // Given/When: the nav renders
    render(<Nav user={ALICE} />);

    // Then: a New habit link to the wizard sits in the sidebar (outside the list)
    const sidebar = screen.getByRole("complementary", { name: "Sidebar" });
    expect(within(sidebar).getByRole("link", { name: "New habit" }).getAttribute("href")).toBe("/habits/new");
  });

  it("shows five tabs in the mobile bottom bar (Settings is behind the avatar)", () => {
    // Given/When: the nav renders
    render(<Nav user={ALICE} />);

    // Then: the bottom bar has Today, Habits, Reflect, Insights, Pet
    const names = within(tabBar())
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(names).toEqual(["Today", "Habits", "Reflect", "Insights", "Pet"]);
  });
});

describe("Nav — active section", () => {
  const cases: Array<[string, string]> = [
    ["/", "Today"],
    ["/habits", "Habits"],
    ["/habits/abc123", "Habits"],
    ["/habits/new", "Habits"],
    ["/journal", "Reflect"],
    ["/review", "Reflect"],
    ["/reflect", "Reflect"],
    ["/analytics", "Insights"],
    ["/hall-of-fame", "Insights"],
    ["/insights", "Insights"],
    ["/pet", "Pet"],
  ];

  it.each(cases)("marks the right tab current on %s", (pathname, expected) => {
    // Given: the user is on a page
    usePathnameMock.mockReturnValue(pathname);

    // When: the nav renders
    render(<Nav user={ALICE} />);

    // Then: exactly that section is aria-current in both the tab bar and sidebar
    const tabCurrent = within(tabBar())
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page")
      .map((link) => link.textContent);
    expect(tabCurrent).toEqual([expected]);
    expect(currentLabels(sidebarNav())).toEqual([expected]);
  });

  it("treats Identity as part of Settings", () => {
    // Given: the user is on the Identity page (reached from Settings)
    usePathnameMock.mockReturnValue("/identity");

    // When: the nav renders
    render(<Nav user={ALICE} />);

    // Then: Settings is current in the sidebar and no bottom tab is
    expect(currentLabels(sidebarNav())).toEqual(["Settings"]);
    const tabCurrent = within(tabBar())
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(tabCurrent).toHaveLength(0);
    // And: the mobile avatar link (→ Settings) is marked current instead
    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("link", { name: "Settings", current: "page" })).toBeTruthy();
  });
});

describe("Nav — mobile top bar", () => {
  it("titles the bar with the current section and offers New habit + Settings", () => {
    // Given: the user is on a habit detail page
    usePathnameMock.mockReturnValue("/habits/abc123");

    // When: the nav renders
    render(<Nav user={ALICE} />);

    // Then: the banner shows the section name, a labelled New habit button and
    // the avatar shortcut to Settings
    const banner = screen.getByRole("banner");
    expect(within(banner).getByText("Habits")).toBeTruthy();
    expect(within(banner).getByRole("link", { name: "New habit" }).getAttribute("href")).toBe("/habits/new");
    expect(within(banner).getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/settings");
    // And: it is flagged so floating help bubbles keep clear of it
    expect(banner.hasAttribute("data-top-obstruction")).toBe(true);
  });

  it("flags the bottom tab bar as a bottom obstruction for popovers", () => {
    // Given/When: the nav renders
    render(<Nav user={ALICE} />);

    // Then: HelpTip can find the tab bar to keep bubbles above it
    expect(tabBar().hasAttribute("data-bottom-obstruction")).toBe(true);
  });
});

describe("Nav — user footer", () => {
  it("shows the user's initial in the avatar", () => {
    // Given/When: a named user
    render(<Nav user={ALICE} />);

    // Then: the sidebar avatar shows the first letter of the name
    expect(screen.getByTestId("nav-avatar").textContent).toBe("A");
  });

  it("falls back to the email's first letter when the name is missing", () => {
    // Given/When: a user with no name
    render(<Nav user={{ name: null, email: "bob@example.com" }} />);

    // Then: the avatar uses the email initial
    expect(screen.getByTestId("nav-avatar").textContent).toBe("B");
  });

  it("shows a default initial when both name and email are missing", () => {
    // Given/When: an anonymous-looking user
    render(<Nav user={{ name: null, email: null }} />);

    // Then: the avatar shows the default initial
    expect(screen.getByTestId("nav-avatar").textContent).toBe("A");
  });

  it("shows the total vote count", () => {
    // Given: two habits with 2 + 1 completed days
    useStoreContextMock.mockReturnValue({
      habits: [
        makeHabit("read", { "2024-01-01": true, "2024-01-02": true }),
        makeHabit("write", { "2024-01-01": true }),
      ],
    });

    // When: the nav renders
    render(<Nav user={ALICE} />);

    // Then: every completion counts as one vote
    expect(screen.getByText("3 votes cast")).toBeTruthy();
  });

  it("offers a labelled sign-out button", () => {
    // Given/When: the nav renders
    render(<Nav user={ALICE} />);

    // Then: sign out is a real submit button with an accessible name
    const signOut = screen.getByRole("button", { name: "Sign out" });
    expect(signOut.getAttribute("type")).toBe("submit");
  });
});

describe("Nav — keyboard shortcuts", () => {
  it("maps section keys to the new IA (T, H, N, R, I, P, comma)", () => {
    // Given: the nav is listening for shortcuts
    render(<Nav user={ALICE} />);

    const shortcuts: [string, string][] = [
      ["t", "/"],
      ["h", "/habits"],
      ["n", "/habits/new"],
      ["r", "/journal"],
      ["i", "/analytics"],
      ["p", "/pet"],
      [",", "/settings"],
    ];

    // When: each key is pressed, Then: the router goes to its section
    for (const [key, href] of shortcuts) {
      fireEvent.keyDown(window, { key });
      expect(routerPushMock).toHaveBeenLastCalledWith(href);
    }
    expect(routerPushMock).toHaveBeenCalledTimes(shortcuts.length);
  });

  it("keeps the old deep-link keys for individual Reflect/Insights pages (J, W, A, F)", () => {
    // Given: the nav is listening for shortcuts
    render(<Nav user={ALICE} />);

    const shortcuts: [string, string][] = [
      ["J", "/journal"],
      ["w", "/review"],
      ["a", "/analytics"],
      ["f", "/hall-of-fame"],
    ];

    // When/Then: each legacy key still reaches its page
    for (const [key, href] of shortcuts) {
      fireEvent.keyDown(window, { key });
      expect(routerPushMock).toHaveBeenLastCalledWith(href);
    }
  });

  it("ignores keys pressed while typing in an input or textarea", () => {
    // Given: form fields alongside the nav
    render(
      <div>
        <input data-testid="test-input" />
        <textarea data-testid="test-textarea" />
        <Nav user={ALICE} />
      </div>,
    );

    // When: the user types shortcut letters into them
    fireEvent.keyDown(screen.getByTestId("test-input"), { key: "h" });
    fireEvent.keyDown(screen.getByTestId("test-textarea"), { key: "j" });

    // Then: navigation is not triggered
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("ignores keys combined with a modifier (so Ctrl+R still reloads)", () => {
    // Given: the nav is listening for shortcuts
    render(<Nav user={ALICE} />);

    // When: the user presses Ctrl+R and Cmd+T
    fireEvent.keyDown(window, { key: "r", ctrlKey: true });
    fireEvent.keyDown(window, { key: "t", metaKey: true });

    // Then: the browser shortcuts are left alone
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("does nothing for unmapped keys such as the retired 'L' lessons shortcut", () => {
    // Given: the nav is listening for shortcuts
    render(<Nav user={ALICE} />);

    // When: the user presses L
    fireEvent.keyDown(window, { key: "l" });

    // Then: the router is not invoked
    expect(routerPushMock).not.toHaveBeenCalled();
  });
});
