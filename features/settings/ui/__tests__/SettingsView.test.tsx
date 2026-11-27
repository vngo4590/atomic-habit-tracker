import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StoreContextProvider } from "@/components/StoreProvider";
import { testStoreContext } from "@/lib/test/fixtures";

const mocks = vi.hoisted(() => ({
  updateProfileAction: vi.fn(),
  importDataAction: vi.fn(),
}));

vi.mock("@/lib/actions/auth", () => ({
  logoutAction: vi.fn(),
  signOutEverywhereAction: vi.fn(),
  updateProfileAction: mocks.updateProfileAction,
  changePasswordAction: vi.fn(),
}));

vi.mock("@/features/settings/actions", () => ({
  importDataAction: mocks.importDataAction,
}));

vi.mock("@/lib/logger-client", () => ({
  clientLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { SettingsView } from "../SettingsView";

/** Stub `/api/v1/session` with the given JSON (or a rejection). */
function mockSession(result: { name: string; email: string } | Error) {
  const fetchMock = vi.fn(() =>
    result instanceof Error
      ? Promise.reject(result)
      : Promise.resolve({ json: () => Promise.resolve({ data: { user: result } }) }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderSettings(patch: Parameters<typeof testStoreContext>[0] = {}) {
  const store = testStoreContext({ showToast: vi.fn(), setPreferences: vi.fn(), ...patch });
  render(
    <StoreContextProvider value={store}>
      <SettingsView />
    </StoreContextProvider>,
  );
  return store;
}

describe("SettingsView", () => {
  beforeEach(() => {
    mocks.updateProfileAction.mockReset();
    mocks.importDataAction.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("links every section from the section nav", () => {
    // Given: the settings page
    mockSession({ name: "Ada", email: "ada@example.com" });
    renderSettings();

    // When: we read the section nav
    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));

    // Then: each link targets a real, labelled section on the page
    expect(hrefs).toEqual(["#profile", "#appearance", "#preferences", "#data", "#identity", "#account"]);
    for (const href of hrefs) {
      expect(document.querySelector(`section${href}`)).not.toBeNull();
    }
  });

  it("shows the signed-in user's name and email once the profile loads", async () => {
    // Given: a session for Ada
    mockSession({ name: "Ada", email: "ada@example.com" });

    // When: the page renders
    renderSettings();

    // Then: the profile rows show her details
    expect(await screen.findByText("ada@example.com")).toBeTruthy();
    expect(screen.getByText("Ada")).toBeTruthy();
  });

  it("offers a retry when the profile can't be loaded", async () => {
    // Given: the session request fails, then succeeds
    const fetchMock = mockSession(new Error("offline"));
    renderSettings();
    const retry = await screen.findByRole("button", { name: "Try again" });

    // When: the user retries
    mockSession({ name: "Ada", email: "ada@example.com" });
    fireEvent.click(retry);

    // Then: the profile loads and the error row disappears
    expect(await screen.findByText("ada@example.com")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("saves a new display name, closes the editor and confirms with a toast", async () => {
    // Given: a loaded profile and a successful profile action
    mockSession({ name: "Ada", email: "ada@example.com" });
    mocks.updateProfileAction.mockResolvedValue({ ok: true, message: "Profile updated." });
    const store = renderSettings();
    await screen.findByText("ada@example.com");

    // When: the user edits and saves their name
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Ada L" } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Save name" }).closest("form")!);
    });

    // Then: the row shows the new name, the editor closes and a toast confirms
    await waitFor(() => expect(screen.getByText("Ada L")).toBeTruthy());
    expect(screen.queryByLabelText("Display name")).toBeNull();
    expect(store.showToast).toHaveBeenCalledWith("Profile updated");
  });

  it("saves a reminder preference immediately and confirms it", () => {
    // Given: weekly review nudges are on
    mockSession({ name: "Ada", email: "ada@example.com" });
    const store = renderSettings();
    const nudge = screen.getByRole("switch", { name: "Weekly review nudge" });
    expect(nudge.getAttribute("aria-checked")).toBe("true");

    // When: the user turns it off
    fireEvent.click(nudge);

    // Then: the preference is saved and a toast confirms it
    expect(store.setPreferences).toHaveBeenCalledWith({ weeklyReviewNudge: false });
    expect(store.showToast).toHaveBeenCalledWith("Weekly review nudge off");
  });

  it("asks for confirmation before importing a chosen backup", async () => {
    // Given: a chosen backup file
    mockSession({ name: "Ada", email: "ada@example.com" });
    mocks.importDataAction.mockResolvedValue({ ok: false, message: "That file isn't an Atomicly backup." });
    const store = renderSettings();
    const file = new File(['{"version":1}'], "backup.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve('{"version":1}') });

    // When: the user picks it
    fireEvent.change(screen.getByLabelText("Backup file"), { target: { files: [file] } });

    // Then: nothing is imported until they confirm
    expect(await screen.findByText("backup.json")).toBeTruthy();
    expect(mocks.importDataAction).not.toHaveBeenCalled();

    // When: they confirm
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Import" }));
    });

    // Then: the file is sent and the server's message is shown
    expect(mocks.importDataAction).toHaveBeenCalledWith('{"version":1}');
    expect(store.showToast).toHaveBeenCalledWith("That file isn't an Atomicly backup.");
  });
});
