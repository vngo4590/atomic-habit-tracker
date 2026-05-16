import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

describe("Nav business logic", () => {
  beforeEach(() => {
    routerPushMock.mockClear();
    usePathnameMock.mockReturnValue("/");
    useStoreContextMock.mockReturnValue({ habits: [] as Habit[] });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders all nav groups (Practice, Reflect, Learn, Become)", () => {
    // Given the navigation sidebar
    // When it is rendered
    render(<Nav user={{ name: "Alice", email: "alice@example.com" }} />);

    // Then all four group labels are visible
    expect(screen.getByText("Practice")).toBeTruthy();
    expect(screen.getByText("Reflect")).toBeTruthy();
    expect(screen.getByText("Learn")).toBeTruthy();
    expect(screen.getByText("Become")).toBeTruthy();

    // And all nav items are present
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("All habits")).toBeTruthy();
    expect(screen.getByText("New habit")).toBeTruthy();
    expect(screen.getByText("Analytics")).toBeTruthy();
    expect(screen.getByText("Journal")).toBeTruthy();
    expect(screen.getByText("Weekly review")).toBeTruthy();
    expect(screen.getByText("Daily lessons")).toBeTruthy();
    expect(screen.getByText("Hall of Fame")).toBeTruthy();
    expect(screen.getByText("Identity")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("highlights the active item based on the current path", () => {
    // Given the user is on the All habits page
    usePathnameMock.mockReturnValue("/habits");

    // When the nav is rendered
    render(<Nav user={{ name: "Alice", email: "alice@example.com" }} />);

    // Then the All habits link has the active class
    const activeLink = screen.getByText("All habits").closest("a");
    expect(activeLink?.classList.contains("active")).toBe(true);

    // And the Today link does not have the active class
    const todayLink = screen.getByText("Today").closest("a");
    expect(todayLink?.classList.contains("active")).toBe(false);
  });

  it("highlights All habits when viewing a specific habit detail page", () => {
    // Given the user is on a habit detail page
    usePathnameMock.mockReturnValue("/habits/abc123");

    // When the nav is rendered
    render(<Nav user={{ name: "Alice", email: "alice@example.com" }} />);

    // Then the All habits link is still highlighted
    const activeLink = screen.getByText("All habits").closest("a");
    expect(activeLink?.classList.contains("active")).toBe(true);
  });

  it("does not highlight All habits when on the New habit page", () => {
    // Given the user is on the New habit page
    usePathnameMock.mockReturnValue("/habits/new");

    // When the nav is rendered
    render(<Nav user={{ name: "Alice", email: "alice@example.com" }} />);

    // Then the All habits link is not highlighted
    const habitsLink = screen.getByText("All habits").closest("a");
    expect(habitsLink?.classList.contains("active")).toBe(false);

    // And the New habit link is highlighted
    const newHabitLink = screen.getByText("New habit").closest("a");
    expect(newHabitLink?.classList.contains("active")).toBe(true);
  });

  it("shows the user's initials in the avatar", () => {
    // Given a user with a name
    // When the nav is rendered
    const { container } = render(<Nav user={{ name: "Alice", email: "alice@example.com" }} />);

    // Then the avatar shows the first initial
    expect(container.querySelector(".avatar")?.textContent).toBe("A");
  });

  it("shows the first letter of the email when name is missing", () => {
    // Given a user with no name but an email
    // When the nav is rendered
    render(<Nav user={{ name: null, email: "bob@example.com" }} />);

    // Then the avatar shows the first initial of the email
    expect(screen.getByText("B")).toBeTruthy();
  });

  it("shows a default initial when both name and email are missing", () => {
    // Given a user with no name and no email
    // When the nav is rendered
    const { container } = render(<Nav user={{ name: null, email: null }} />);

    // Then the avatar shows the default initial
    expect(container.querySelector(".avatar")?.textContent).toBe("A");
  });

  it("shows the total vote count in the sidebar foot", () => {
    // Given a user with habits that have history entries
    const habits: Habit[] = [
      {
        id: "h1",
        name: "Read",
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
        stack: "",
        identity: "reader",
        environment: "",
        schedule: "Daily",
        time: "Morning",
        contract: "",
        contractPartners: [],
        history: { "2024-01-01": true, "2024-01-02": true },
        notes: [],
        createdAt: "2024-01-01",
      },
      {
        id: "h2",
        name: "Write",
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
        stack: "",
        identity: "writer",
        environment: "",
        schedule: "Daily",
        time: "Morning",
        contract: "",
        contractPartners: [],
        history: { "2024-01-01": true },
        notes: [],
        createdAt: "2024-01-01",
      },
    ];

    useStoreContextMock.mockReturnValue({ habits });

    // When the nav is rendered
    render(<Nav user={{ name: "Alice", email: "alice@example.com" }} />);

    // Then the sidebar foot shows the total vote count (2 + 1 = 3)
    expect(screen.getByText("3 votes cast")).toBeTruthy();
  });

  it("navigates to the correct page when keyboard shortcuts are pressed", () => {
    // Given the nav is rendered and listening for keyboard events
    render(<Nav user={{ name: "Alice", email: "alice@example.com" }} />);

    // When the user presses the 'h' key
    fireEvent.keyDown(window, { key: "h" });

    // Then the router navigates to the All habits page
    expect(routerPushMock).toHaveBeenCalledWith("/habits");

    // When the user presses the 't' key
    fireEvent.keyDown(window, { key: "T" });

    // Then the router navigates to the Today page
    expect(routerPushMock).toHaveBeenCalledWith("/");

    // When the user presses the 'a' key
    fireEvent.keyDown(window, { key: "a" });

    // Then the router navigates to Analytics
    expect(routerPushMock).toHaveBeenCalledWith("/analytics");
  });

  it("does not fire shortcuts when the user is typing in an input", () => {
    // Given the nav is rendered alongside an input field
    render(
      <div>
        <input data-testid="test-input" />
        <Nav user={{ name: "Alice", email: "alice@example.com" }} />
      </div>,
    );

    // When the user types 'h' inside the input
    const input = screen.getByTestId("test-input");
    fireEvent.keyDown(input, { key: "h" });

    // Then navigation is not triggered
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("does not fire shortcuts when the user is typing in a textarea", () => {
    // Given the nav is rendered alongside a textarea
    render(
      <div>
        <textarea data-testid="test-textarea" />
        <Nav user={{ name: "Alice", email: "alice@example.com" }} />
      </div>,
    );

    // When the user types 'j' inside the textarea
    const textarea = screen.getByTestId("test-textarea");
    fireEvent.keyDown(textarea, { key: "j" });

    // Then navigation is not triggered
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("covers all navigation shortcuts (T, H, N, A, J, W, L, F, I, comma)", () => {
    // Given the nav is rendered
    render(<Nav user={{ name: "Alice", email: "alice@example.com" }} />);

    // When each shortcut key is pressed
    const shortcuts: [string, string][] = [
      ["t", "/"],
      ["h", "/habits"],
      ["n", "/habits/new"],
      ["a", "/analytics"],
      ["j", "/journal"],
      ["w", "/review"],
      ["l", "/lessons"],
      ["f", "/hall-of-fame"],
      ["i", "/identity"],
      [",", "/settings"],
    ];

    for (const [key, href] of shortcuts) {
      fireEvent.keyDown(window, { key });
      expect(routerPushMock).toHaveBeenCalledWith(href);
    }

    // Then all 10 shortcuts resulted in navigation
    expect(routerPushMock).toHaveBeenCalledTimes(10);
  });
});
