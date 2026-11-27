import { expect, test, type Page } from "@playwright/test";

import { checkInOn, cleanupHabits, dayKey, listHabits, seedHabit, setPreferences, unique } from "./helpers";

/**
 * Habit lifecycle journeys (AGENTS.md § App Context: Today, All Habits, habit
 * detail, New Habit wizard, active-habit cap).
 *
 * Runs as the shared dev user. Every test starts from zero active habits so
 * Today, the library and the 3-habit cap are deterministic.
 */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Short weekday name `offset` days from today (local zone). */
function weekdayName(offset = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return WEEKDAYS[date.getDay()];
}

/** The library list row (its check button) for a habit. */
function libraryCheck(page: Page, name: string, done = false) {
  return page.getByRole("button", { name: `${done ? "Uncheck" : "Check"} ${name} for today` });
}

/** Close the optional mood sheet that follows a fresh check-in. */
async function closeMoodSheet(page: Page) {
  const sheet = page.getByRole("dialog").filter({ hasText: "feel?" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await setPreferences(page, { onboardingSeen: true });
  await cleanupHabits(page);
});

test.afterAll(async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    storageState: "e2e/.auth/user.json",
  });
  const page = await context.newPage();
  await cleanupHabits(page);
  await context.close();
});

test.describe("New Habit wizard", () => {
  test("blocks each required step with an inline error until it is answered", async ({ page }) => {
    // Given: the first step of the wizard
    await page.goto("/habits/new");
    await expect(page.getByRole("heading", { level: 2, name: "What's the tiny habit?" })).toBeVisible();

    // When: the user presses Next without describing the habit
    await page.getByRole("button", { name: "Next" }).click();

    // Then: the habit step explains what is missing and does not advance
    await expect(page.getByText("Add what you'll do — even something tiny.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "What's the tiny habit?" })).toBeVisible();

    // When: they answer it and move on, then skip the identity
    await page.getByRole("textbox", { name: /I will/ }).fill("stretch for two minutes");
    await expect(page.getByText("Add what you'll do — even something tiny.")).toBeHidden();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Who are you becoming?" })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();

    // Then: the identity step explains what is missing as well
    await expect(page.getByText("Add who this habit helps you become.")).toBeVisible();

    // When: they go Back
    await page.getByRole("button", { name: "Back" }).click();

    // Then: their earlier answer is still there
    await expect(page.getByRole("textbox", { name: /I will/ })).toHaveValue("stretch for two minutes");
  });

  test("walks every step, previews the sentence, and creates a weekday habit", async ({ page }) => {
    // Given: a user with no habits opens the wizard
    const name = unique("Write one line");
    await page.goto("/habits/new");

    // When: they describe the habit and identity
    await page.getByRole("textbox", { name: /I will/ }).fill(name);
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("textbox", { name: /So I can become/ }).fill("a writer");
    await page.getByRole("button", { name: "Next" }).click();

    // And: set the cue, place, and a Weekdays schedule
    await expect(page.getByRole("heading", { level: 2, name: "When and where?" })).toBeVisible();
    await page.getByRole("textbox", { name: /When\?/ }).fill("after I pour my coffee");
    await page.getByRole("textbox", { name: /Where\?/ }).fill("at my desk");
    const presets = page.getByRole("group", { name: "Schedule presets" });
    await presets.getByRole("button", { name: "Weekdays" }).click();
    await expect(presets.getByRole("button", { name: "Weekdays" })).toHaveAttribute("aria-pressed", "true");
    const days = page.getByRole("group", { name: "Days of the week" });
    await expect(days.getByRole("button", { name: "Mon" })).toHaveAttribute("aria-pressed", "true");
    await expect(days.getByRole("button", { name: "Sat" })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "Next" }).click();

    // And: skip the optional "Make it stick" laws
    await expect(page.getByRole("heading", { level: 2, name: "Make it stick (optional)" })).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();

    // Then: the review shows their full habit sentence and answers
    await expect(page.getByRole("heading", { level: 2, name: "Review your habit" })).toBeVisible();
    const preview = page.getByTestId("habit-sentence-preview");
    await expect(preview).toContainText(name.toLowerCase());
    await expect(preview).toContainText("a writer");
    await expect(page.getByText("Weekdays", { exact: true })).toBeVisible();

    // When: they create the habit
    await page.getByRole("button", { name: "Create habit" }).click();

    // Then: it is listed in the library and saved with the Weekdays schedule
    await expect(page).toHaveURL(/\/habits$/);
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
    await expect
      .poll(async () => (await listHabits(page)).find((habit) => habit.name === name)?.schedule)
      .toBe("Weekdays");
  });

  test("returns to an earlier step from the review to correct an answer", async ({ page }) => {
    // Given: a user who reached the review step
    const name = unique("Read a page");
    await page.goto("/habits/new");
    await page.getByRole("textbox", { name: /I will/ }).fill(name);
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("textbox", { name: /So I can become/ }).fill("a reader");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Review your habit" })).toBeVisible();

    // When: they edit the identity from the review
    await page.getByRole("button", { name: "Edit identity" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Who are you becoming?" })).toBeVisible();
    await page.getByRole("textbox", { name: /So I can become/ }).fill("a lifelong learner");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Skip" }).click();

    // Then: the preview reflects the corrected identity
    await expect(page.getByTestId("habit-sentence-preview")).toContainText("a lifelong learner");
  });
});

test.describe("active habit cap", () => {
  test("with three active habits the wizard explains the cap and cannot create a fourth", async ({ page }) => {
    // Given: the user already has three active habits
    for (const label of ["Cap one", "Cap two", "Cap three"]) {
      await seedHabit(page, unique(label), "a focused person");
    }

    // When: they open the wizard and reach the review step
    await page.goto("/habits/new");
    await expect(page.getByRole("note")).toContainText("maximum of 3 active habits");
    await page.getByRole("textbox", { name: /I will/ }).fill(unique("Fourth habit"));
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("textbox", { name: /So I can become/ }).fill("an overachiever");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Skip" }).click();

    // Then: Create habit stays disabled
    await expect(page.getByRole("button", { name: "Create habit" })).toBeDisabled();

    // And: the API refuses a fourth habit with a cap error
    const response = await page.request.post("/api/v1/habits", {
      data: { name: unique("Sneaky fourth"), identity: "x", schedule: "Daily", time: "Morning", contractPartners: [] },
    });
    expect(response.status()).toBe(409);
    expect((await response.json()).error.code).toBe("habit_cap_reached");
    expect(await listHabits(page)).toHaveLength(3);
  });

  test("deleting a habit frees a slot so a new one can be created", async ({ page }) => {
    // Given: three active habits, one of which the user deletes from its page
    const doomed = unique("Doomed habit");
    const doomedId = await seedHabit(page, doomed, "a minimalist");
    await seedHabit(page, unique("Keeper one"), "a keeper");
    await seedHabit(page, unique("Keeper two"), "a keeper");
    await page.goto(`/habits/${doomedId}`);
    await page.getByRole("button", { name: "Delete habit" }).click();
    await page.getByRole("group", { name: "Confirm deleting this habit" }).getByRole("button", { name: "Confirm delete" }).click();
    await expect(page).toHaveURL(/\/habits$/);
    await expect.poll(async () => (await listHabits(page)).length).toBe(2);

    // When: they open the wizard
    await page.goto("/habits/new");

    // Then: there is no cap banner and the API accepts a new habit
    await expect(page.getByRole("heading", { level: 2, name: "What's the tiny habit?" })).toBeVisible();
    await expect(page.getByRole("note")).toHaveCount(0);
    await seedHabit(page, unique("Replacement"), "a keeper");
    expect(await listHabits(page)).toHaveLength(3);
  });
});

test.describe("Today check-ins", () => {
  test("checking in a habit moves it to Completed, and Undo puts it back", async ({ page }) => {
    // Given: one daily habit due today
    const name = unique("Drink water");
    const id = await seedHabit(page, name, "a hydrated person");
    await page.goto("/");
    const row = page.getByTestId("habit-row").filter({ hasText: name });
    await expect(row).toHaveAttribute("data-done", "false");

    // When: the user checks it in and dismisses the mood sheet
    await page.getByRole("button", { name: `Mark ${name} done` }).click();
    await closeMoodSheet(page);

    // Then: Today celebrates and lists the habit under Completed
    await expect(page.getByRole("heading", { name: "All done for today" })).toBeVisible();
    const completed = page.getByTestId("completed-list");
    await expect(completed).toContainText("Completed (1)");
    await expect.poll(async () => Boolean((await listHabits(page)).find((h) => h.id === id)?.history[dayKey()])).toBe(true);

    // When: they undo the check-in
    const undo = completed.getByRole("button", { name: `Undo ${name}` });
    if (!(await undo.isVisible())) await completed.locator("summary").click();
    await undo.click();

    // Then: it is back in the focus list as not done, and the vote is removed
    await expect(page.getByRole("button", { name: `Mark ${name} done` })).toBeVisible();
    await expect(page.getByTestId("completed-list")).toHaveCount(0);
    await expect.poll(async () => Boolean((await listHabits(page)).find((h) => h.id === id)?.history[dayKey()])).toBe(false);
  });

  test("a habit not scheduled today stays off Today but remains in the library", async ({ page }) => {
    // Given: the only habit is scheduled for tomorrow's weekday alone
    const name = unique("Tomorrow only");
    await seedHabit(page, name, "a planner", { schedule: weekdayName(1) });

    // When: the user opens Today
    await page.goto("/");

    // Then: Today is a rest day and the habit is not offered for check-in
    await expect(page.getByRole("heading", { name: "Rest day" })).toBeVisible();
    await expect(page.getByRole("button", { name: `Mark ${name} done` })).toHaveCount(0);

    // And: the library still lists it
    await page.goto("/habits");
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  });

  test("a check-in made on Today persists across a reload", async ({ page }) => {
    // Given: a daily habit checked in from Today
    const name = unique("Floss");
    await seedHabit(page, name, "a healthy person");
    await page.goto("/");
    await page.getByRole("button", { name: `Mark ${name} done` }).click();
    await closeMoodSheet(page);
    await expect(page.getByRole("heading", { name: "All done for today" })).toBeVisible();

    // When: the page is reloaded
    await page.reload();

    // Then: the habit is still done for today
    await expect(page.getByRole("heading", { name: "All done for today" })).toBeVisible();
    await expect(page.getByTestId("completed-list")).toContainText("Completed (1)");
  });
});

test.describe("habits library", () => {
  test("checks and unchecks a habit and filters it with the Done today tab", async ({ page }) => {
    // Given: two daily habits
    const done = unique("Library done");
    const pending = unique("Library pending");
    await seedHabit(page, done, "a finisher");
    await seedHabit(page, pending, "a starter");
    await page.goto("/habits");
    await expect(page.getByRole("heading", { level: 1, name: "All habits" })).toBeVisible();

    // When: the user checks one in from the library
    await libraryCheck(page, done).click();
    await closeMoodSheet(page);

    // Then: its check is pressed
    await expect(libraryCheck(page, done, true)).toHaveAttribute("aria-pressed", "true");

    // When: they switch to the Done today tab
    await page.getByRole("tab", { name: "Done today" }).click();

    // Then: only the checked habit is listed
    const panel = page.getByRole("tabpanel");
    await expect(panel.getByRole("link", { name: new RegExp(done) })).toBeVisible();
    await expect(panel.getByRole("link", { name: new RegExp(pending) })).toHaveCount(0);

    // When: they uncheck it there
    await libraryCheck(page, done, true).click();

    // Then: the Done today tab is empty
    await expect(page.getByRole("status").filter({ hasText: "No habits match" })).toHaveText("No habits match this filter.");

    // And: both habits are back under All and Upcoming
    await page.getByRole("tab", { name: "Upcoming" }).click();
    await expect(page.getByRole("tabpanel").getByRole("link")).toHaveCount(2);
    await page.getByRole("tab", { name: "All" }).click();
    await expect(page.getByRole("tabpanel").getByRole("link")).toHaveCount(2);
  });

  test("searches by name or identity and explains when nothing matches", async ({ page }) => {
    // Given: two habits with different identities
    const run = unique("Morning run");
    const read = unique("Evening read");
    await seedHabit(page, run, "an athlete");
    await seedHabit(page, read, "a scholar");
    await page.goto("/habits");
    const search = page.getByRole("searchbox", { name: "Search habits by name, identity or cue" })
      .or(page.getByRole("textbox", { name: "Search habits by name, identity or cue" }));

    // When: they search by identity
    await search.fill("scholar");

    // Then: only the matching habit remains
    await expect(page.getByRole("tabpanel").getByRole("link")).toHaveCount(1);
    await expect(page.getByRole("link", { name: new RegExp(read) })).toBeVisible();

    // When: they search for something that matches nothing
    await search.fill("zzz-no-such-habit");

    // Then: the empty-search message names the query
    await expect(page.getByRole("status").filter({ hasText: "No habits match" })).toHaveText('No habits match "zzz-no-such-habit".');

    // When: they clear the search
    await page.getByRole("button", { name: "Clear search" }).click();

    // Then: every habit is listed again
    await expect(page.getByRole("tabpanel").getByRole("link")).toHaveCount(2);
  });

  test("sorts habits by name", async ({ page }) => {
    // Given: habits created in non-alphabetical order
    const suffix = unique("");
    await seedHabit(page, `Zebra walk${suffix}`, "a walker");
    await seedHabit(page, `Apple snack${suffix}`, "a healthy eater");
    await seedHabit(page, `Mango smoothie${suffix}`, "a cook");
    await page.goto("/habits");

    // When: they sort by Name
    await page.getByLabel("Sort").selectOption({ label: "Name" });

    // Then: the list reads alphabetically
    const links = page.getByRole("tabpanel").getByRole("link");
    await expect(links).toHaveCount(3);
    await expect(links.nth(0)).toContainText("Apple snack");
    await expect(links.nth(1)).toContainText("Mango smoothie");
    await expect(links.nth(2)).toContainText("Zebra walk");
  });

  test("shows an invitation to create a habit when the library is empty", async ({ page }) => {
    // Given: no active habits
    // When: the user opens the library
    await page.goto("/habits");

    // Then: the empty state offers the wizard
    await expect(page.getByText("No habits in your account yet.")).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: "New habit" }).click();
    await expect(page).toHaveURL(/\/habits\/new$/);
  });
});

test.describe("habit detail", () => {
  test("opens from the library, marks done, and unmarks", async ({ page }) => {
    // Given: a daily habit in the library
    const name = unique("Detail habit");
    await seedHabit(page, name, "a detail-oriented person");
    await page.goto("/habits");

    // When: the user opens it
    await page.getByRole("link", { name: new RegExp(name) }).click();

    // Then: its page shows the name and identity claim
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByText(/a detail-oriented person/i).first()).toBeVisible();

    // When: they mark it done
    await page.getByRole("button", { name: "Mark done" }).click();
    await closeMoodSheet(page);

    // Then: the button reflects today's vote and offers to edit the entry
    await expect(page.getByRole("button", { name: "Done today · tap to unmark" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit entry" })).toBeVisible();

    // When: they tap to unmark
    await page.getByRole("button", { name: "Done today · tap to unmark" }).click();

    // Then: it is back to Mark done
    await expect(page.getByRole("button", { name: "Mark done" })).toBeVisible();
  });

  test("edits the habit sentence and keeps the change after a reload", async ({ page }) => {
    // Given: a habit's detail page
    const name = unique("Old name");
    const renamed = unique("New name");
    const id = await seedHabit(page, name, "a reader");
    await page.goto(`/habits/${id}`);

    // When: the user edits the name and schedule and saves
    await page.getByRole("button", { name: "Edit habit" }).click();
    const panel = page.getByRole("region", { name: "Edit habit" });
    await panel.getByRole("textbox", { name: /I will/ }).fill(renamed);
    await panel.getByRole("group", { name: "Schedule presets" }).getByRole("button", { name: "Weekends" }).click();
    await panel.getByRole("button", { name: "Save changes" }).click();

    // Then: the page shows the new name and schedule
    await expect(page.getByRole("heading", { level: 1, name: renamed })).toBeVisible();
    await expect(page.getByText(/Weekends ·/)).toBeVisible();

    // And: once the server has saved it, the change survives a reload
    await expect.poll(async () => (await listHabits(page)).find((habit) => habit.id === id)?.name).toBe(renamed);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: renamed })).toBeVisible();
    await expect.poll(async () => (await listHabits(page)).find((habit) => habit.id === id)?.schedule).toBe("Weekends");
  });

  test("cancelling an edit or a delete leaves the habit unchanged", async ({ page }) => {
    // Given: a habit's detail page
    const name = unique("Steady habit");
    const id = await seedHabit(page, name, "a steady person");
    await page.goto(`/habits/${id}`);

    // When: the user starts editing, changes the name, then cancels
    await page.getByRole("button", { name: "Edit habit" }).click();
    await page.getByRole("textbox", { name: /I will/ }).fill("Something else");
    await page.getByRole("button", { name: "Cancel" }).click();

    // Then: the original name is still shown
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

    // When: they start a delete and cancel it
    await page.getByRole("button", { name: "Delete habit" }).click();
    await page.getByRole("group", { name: "Confirm deleting this habit" }).getByRole("button", { name: "Cancel" }).click();

    // Then: the habit still exists
    await expect(page.getByRole("button", { name: "Delete habit" })).toBeVisible();
    expect((await listHabits(page)).map((habit) => habit.id)).toContain(id);
  });

  test("deleting removes the habit from the library and Today", async ({ page }) => {
    // Given: a habit's detail page
    const name = unique("Short-lived");
    const id = await seedHabit(page, name, "an experimenter");
    await page.goto(`/habits/${id}`);

    // When: the user confirms deletion
    await page.getByRole("button", { name: "Delete habit" }).click();
    await page.getByRole("group", { name: "Confirm deleting this habit" }).getByRole("button", { name: "Confirm delete" }).click();

    // Then: they are taken to the library, which no longer lists it
    await expect(page).toHaveURL(/\/habits$/);
    await expect(page.getByText("No habits in your account yet.")).toBeVisible();

    // And: once the server has archived it, Today has nothing to check in
    await expect.poll(async () => (await listHabits(page)).length).toBe(0);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Build your first habit in three small steps" })).toBeVisible();
    await expect(page.getByRole("button", { name: `Mark ${name} done` })).toHaveCount(0);
  });

  test("shows a not-found message for a habit that does not exist", async ({ page }) => {
    // Given / When: the user follows a link to an unknown habit
    await page.goto("/habits/does-not-exist");

    // Then: the page says so instead of crashing
    await expect(page.getByText("Habit not found.")).toBeVisible();
  });

  test("shows the past check-ins recorded for the habit", async ({ page }) => {
    // Given: a habit with check-ins on the previous two days
    const name = unique("History habit");
    const id = await seedHabit(page, name, "a consistent person");
    await checkInOn(page, id, dayKey(-1));
    await checkInOn(page, id, dayKey(-2));

    // When: the user opens the habit
    await page.goto(`/habits/${id}`);

    // Then: it is not yet done today
    await expect(page.getByRole("button", { name: "Mark done" })).toBeVisible();

    // And: the history's week view marks exactly the two logged days as done
    await page.getByRole("tab", { name: "History" }).click();
    const panel = page.getByRole("tabpanel");
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: "This week" }).click();
    await expect(panel.locator('[aria-label$=" done"]')).toHaveCount(2);
  });
});
