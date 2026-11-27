import { expect, test, type Page } from "@playwright/test";

import {
  checkInOn,
  dayKey,
  registerUser,
  seedHabit,
  unique,
  waitForSavedCheckIn,
  waitForSavedJournalTitle,
  waitForSavedWeeklyReview,
} from "./helpers";

/**
 * Reflection journeys (AGENTS.md § App Context: Journal, Weekly Review,
 * Identity vote ledger, Analytics, Hall of Fame).
 *
 * Each test registers its own brand-new user so empty states and "this week"
 * data are deterministic and nothing leaks between tests or projects.
 */
test.use({ storageState: { cookies: [], origins: [] } });

/** Close the optional mood sheet that follows a fresh check-in. */
async function closeMoodSheet(page: Page) {
  const sheet = page.getByRole("dialog").filter({ hasText: "feel?" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toBeHidden();
}

test.describe("journal", () => {
  test("writes an entry that is listed and survives a reload", async ({ page }) => {
    // Given: a new user on an empty journal
    await registerUser(page, { prefix: "journal" });
    await page.goto("/journal");
    await expect(page.getByRole("heading", { name: "Your journal is empty" })).toBeVisible();

    // When: they have not given the entry a title yet
    const save = page.getByRole("button", { name: "Save entry" });

    // Then: saving is not possible
    await expect(save).toBeDisabled();

    // When: they write a titled entry and save it
    const title = unique("Small wins");
    await page.getByRole("textbox", { name: "Title" }).fill(title);
    await page.getByRole("textbox", { name: /Reflection/ }).fill("Two-minute rule made the run happen.");
    await save.click();

    // Then: the entry is listed and the empty state is gone
    await expect(page.getByRole("heading", { level: 3, name: title })).toBeVisible();
    await expect(page.getByText("Two-minute rule made the run happen.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your journal is empty" })).toHaveCount(0);

    // And: once saved, it is still there after a reload
    await waitForSavedJournalTitle(page, title);
    await page.reload();
    await expect(page.getByRole("heading", { level: 3, name: title })).toBeVisible();
  });

  test("edits an existing entry in place", async ({ page }) => {
    // Given: a user with one journal entry
    await registerUser(page, { prefix: "journal-edit" });
    await page.goto("/journal");
    const title = unique("First draft");
    await page.getByRole("textbox", { name: "Title" }).fill(title);
    await page.getByRole("button", { name: "Save entry" }).click();
    await expect(page.getByRole("heading", { level: 3, name: title })).toBeVisible();
    await waitForSavedJournalTitle(page, title);

    // When: they edit its title and save
    const renamed = unique("Final draft");
    await page.getByRole("button", { name: `Edit ${title}` }).click();
    const editor = page.getByRole("region", { name: "Edit entry" });
    await editor.getByRole("textbox", { name: "Title" }).fill(renamed);
    await editor.getByRole("button", { name: "Save changes" }).click();

    // Then: only the renamed entry is listed, also after a reload
    await expect(page.getByRole("heading", { level: 3, name: renamed })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: title })).toHaveCount(0);
    await waitForSavedJournalTitle(page, renamed);
    await page.reload();
    await expect(page.getByRole("heading", { level: 3, name: renamed })).toBeVisible();
  });
});

test.describe("weekly review", () => {
  test("guides the user through three questions and saves the review for this week", async ({ page }) => {
    // Given: a new user with no review this week
    await registerUser(page, { prefix: "review" });
    await page.goto("/review");
    await expect(page.getByRole("heading", { name: "Reflect on this week" })).toBeVisible();

    // When: they start the review and answer each step
    await page.getByRole("button", { name: "Write this week's review" }).click();
    const answers = ["Morning runs felt easy.", "Skipped reading twice.", "Read right after dinner."];
    for (const [index, answer] of answers.entries()) {
      await expect(page.getByText(`Step ${index + 1} of 3`)).toBeVisible();
      await page.getByRole("textbox").last().fill(answer);
      if (index < answers.length - 1) await page.getByRole("button", { name: "Next", exact: true }).click();
    }
    await page.getByRole("button", { name: "Save review" }).click();

    // Then: the save is confirmed and the summary shows their answers
    await expect(page.getByText("Weekly review saved")).toBeVisible();
    await expect(page.getByRole("heading", { name: "This week's review" })).toBeVisible();
    for (const answer of answers) await expect(page.getByText(answer)).toBeVisible();

    // And: once saved, the review is still there after a reload
    await waitForSavedWeeklyReview(page, dayKey(-6), answers[2]);
    await page.reload();
    await expect(page.getByText("Read right after dinner.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Write this week's review" })).toHaveCount(0);
  });

  test("cancelling the review wizard saves nothing", async ({ page }) => {
    // Given: a new user who starts a review
    await registerUser(page, { prefix: "review-cancel" });
    await page.goto("/review");
    await page.getByRole("button", { name: "Write this week's review" }).click();
    await page.getByRole("textbox").last().fill("Not ready to commit to this.");

    // When: they cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Then: the week is still unreviewed, also after a reload
    await expect(page.getByRole("button", { name: "Write this week's review" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Reflect on this week" })).toBeVisible();
  });
});

test.describe("identity vote ledger", () => {
  test("a check-in on Today casts a vote for the habit's identity", async ({ page }) => {
    // Given: a new user with one habit and no votes
    await registerUser(page, { prefix: "identity" });
    const name = unique("Run a mile");
    const id = await seedHabit(page, name, "a runner");
    await page.goto("/identity");
    await expect(page.getByRole("heading", { name: "No votes cast yet" })).toBeVisible();

    // When: they check the habit in on Today
    await page.goto("/");
    await page.getByRole("button", { name: `Mark ${name} done` }).click();
    await closeMoodSheet(page);
    await expect(page.getByRole("heading", { name: "All done for today" })).toBeVisible();
    await waitForSavedCheckIn(page, id, dayKey());

    // Then: the identity page counts one vote for "I am a runner"
    await page.goto("/identity");
    const ledger = page.getByRole("region", { name: "Vote ledger" });
    await expect(ledger.getByRole("listitem").filter({ hasText: "I am a runner" })).toContainText("1 vote");
    await expect(ledger).toContainText("1 vote total");
  });
});

test.describe("analytics", () => {
  test("a new user sees empty analytics with an invitation to create a habit", async ({ page }) => {
    // Given / When: a new user opens Analytics
    await registerUser(page, { prefix: "analytics-empty" });
    await page.goto("/analytics");

    // Then: the page explains there is nothing to analyse yet
    await expect(page.getByRole("heading", { level: 1, name: "Analytics" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No habits to analyse yet" })).toBeVisible();
    await expect(page.getByTestId("kpi-total-check-ins")).toContainText("0");
    await expect(page.getByRole("link", { name: "Create a habit" })).toHaveAttribute("href", "/habits/new");
  });

  test("shows totals, streaks and a per-habit breakdown from recorded check-ins", async ({ page }) => {
    // Given: a habit checked in today and on the two previous days
    await registerUser(page, { prefix: "analytics" });
    const name = unique("Meditate");
    const id = await seedHabit(page, name, "a calm person");
    for (const offset of [0, -1, -2]) await checkInOn(page, id, dayKey(offset));

    // When: the user opens Analytics
    await page.goto("/analytics");

    // Then: the KPIs and breakdown reflect three consecutive check-ins
    await expect(page.getByTestId("kpi-total-check-ins")).toContainText("3");
    const breakdown = page.getByRole("region", { name: "By habit" });
    const row = breakdown.getByRole("listitem").filter({ hasText: name });
    await expect(row).toContainText("3-day streak");
    await expect(row).toContainText("best 3");
    await expect(page.getByText("3 days", { exact: true })).toBeVisible();
  });
});

test.describe("Hall of Fame", () => {
  test("a new user has no inducted habits yet", async ({ page }) => {
    // Given / When: a new user opens the Hall of Fame
    await registerUser(page, { prefix: "hof-empty" });
    await page.goto("/hall-of-fame");

    // Then: the inducted list is empty and nothing is ready for review
    await expect(page.getByRole("heading", { level: 1, name: "Hall of Fame" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No inducted habits yet" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ready for review" })).toHaveCount(0);
  });

  test("after 66 days a habit can be reviewed and inducted, freeing an active slot", async ({ page }) => {
    // Given: a user whose habit is now more than 66 days old
    await registerUser(page, { prefix: "hof" });
    const name = unique("Journal nightly");
    await seedHabit(page, name, "a reflective person");
    await page.clock.setFixedTime(new Date(Date.now() + 70 * 24 * 60 * 60 * 1000));

    // When: they open the Hall of Fame and review the habit
    await page.goto("/hall-of-fame");
    await expect(page.getByRole("heading", { name: "Ready for review" })).toBeVisible();
    await page.getByRole("button", { name: `Review ${name}` }).click();
    const dialog = page.getByRole("dialog", { name: new RegExp(name) });
    await expect(dialog).toBeVisible();
    const induct = dialog.getByRole("button", { name: "Induct to Hall of Fame" });

    // Then: induction needs every question answered
    await expect(induct).toBeDisabled();
    const questions = dialog.getByRole("group");
    const count = await questions.count();
    expect(count).toBe(5);
    for (let index = 0; index < count; index++) {
      await questions.nth(index).getByRole("button", { name: "5", exact: true }).click();
    }

    // When: they induct it
    const saved = page.waitForResponse(
      (response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/hall-of-fame",
    );
    await induct.click();

    // Then: the habit is listed as inducted and no longer awaits review
    await expect(dialog).toBeHidden();
    const inducted = page.getByRole("heading", { level: 3, name });
    await expect(inducted).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ready for review" })).toHaveCount(0);

    // And: once the verdict is saved it is still inducted after a reload
    expect((await saved).ok()).toBe(true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 3, name })).toBeVisible();
  });
});
