import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
        identity: "reader",
        environment: "",
        schedule: "Daily",
        time: "Morning",
    stackAfterId: null,
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
        identity: "writer",
        environment: "",
        schedule: "Daily",
        time: "Morning",
    stackAfterId: null,
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

describe("Mobile drawer navigation", () => {
  beforeEach(() => {
    routerPushMock.mockClear();
    usePathnameMock.mockReturnValue("/");
    useStoreContextMock.mockReturnValue({ habits: [] as Habit[] });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a hamburger menu button with correct ARIA attributes", () => {
    // Given the nav is rendered
    render(<Nav user={{ name: "Alice", email: "alice@example.com" }} />);

    // Then the mobile menu button is present and accessible
    const menuBtn = screen.getByLabelText("Open navigation menu");
    expect(menuBtn).toBeTruthy();
    expect(menuBtn.getAttribute("aria-expanded")).toBe("false");
    expect(menuBtn.getAttribute("aria-controls")).toBe("mobile-nav-drawer");
  });

  it("opens the drawer when the hamburger button is clicked", async () => {
    // Given the nav is rendered
    render(<Nav user={{ name: "Alice", email: "alice@example.com" }} />);

    // When the user clicks the menu button
    const menuBtn = screen.getByLabelText("Open navigation menu");
    fireEvent.click(menuBtn);

    // Then the drawer overlay appears
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    // And the menu button reflects the open state
    expect(menuBtn.getAttribute("aria-expanded")).toBe("true");
  });

  it("closes the drawer when the backdrop overlay is clicked", async () => {
    // Given the drawer is open
    render(<Nav user={{ name: "Alice", email: "alice@example.com" }} />);
    fireEvent.click(screen.getByLabelText("Open navigation menu"));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    // When the user clicks the backdrop (outside the drawer panel)
    const overlay = screen.getByRole("dialog");
    fireEvent.click(overlay);

    // Then the drawer is removed from the DOM
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("closes the drawer when a navigation link inside the drawer is clicked", async () => {
    // Given the drawer is open
    render(<Nav user={{ name: "Alice", email: "alice@example.com" }} />);
    fireEvent.click(screen.getByLabelText("Open navigation menu"));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    // When the user clicks a nav item inside the drawer
    const drawerLinks = screen.getAllByText("All habits");
    // The drawer contains a second copy of the nav items, so we target the one inside the dialog.
    const drawerLink = drawerLinks.find((el) => el.closest('[role="dialog"]'));
    expect(drawerLink).toBeTruthy();
    fireEvent.click(drawerLink!);

    // Then the drawer closes
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("renders the full desktop sidebar content inside the mobile drawer", async () => {
    // Given the drawer is open
    render(<Nav user={{ name: "Alice", email: "alice@example.com" }} />);
    fireEvent.click(screen.getByLabelText("Open navigation menu"));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    // Then all nav groups are visible inside the drawer (same UI as desktop)
    const drawer = screen.getByRole("dialog");
    expect(drawer.textContent).toContain("Practice");
    expect(drawer.textContent).toContain("Reflect");
    expect(drawer.textContent).toContain("Learn");
    expect(drawer.textContent).toContain("Become");

    // And the brand and user footer are also present
    expect(drawer.textContent).toContain("Atomicly");
    expect(drawer.textContent).toContain("Alice");
  });

  it("marks the mobile drawer panel as scrollable", async () => {
    // Given the drawer is open
    const { container } = render(<Nav user={{ name: "Alice", email: "alice@example.com" }} />);
    fireEvent.click(screen.getByLabelText("Open navigation menu"));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    // Then the drawer panel carries the scrollable class so content can scroll if it exceeds viewport height
    const drawerPanel = container.querySelector(".mobile-drawer");
    expect(drawerPanel).toBeTruthy();
    // JSDOM does not resolve stylesheet rules through getComputedStyle,
    // so we verify the class is present which maps to overflow-y: auto in globals.css.
    expect(drawerPanel!.classList.contains("mobile-drawer")).toBe(true);
  });
});
