import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Field, Input, Select, TextArea } from "@/components/ui/Field";

afterEach(() => cleanup());

describe("Field", () => {
  // Given: a field with a label and a hint
  // When: it renders an Input
  // Then: the label names the input and the hint describes it.
  it("wires the label and hint to the input", () => {
    render(
      <Field label="Habit name" hint="Keep it short.">
        <Input />
      </Field>,
    );

    const input = screen.getByRole("textbox", { name: "Habit name" });
    const hint = screen.getByText("Keep it short.");
    expect(input.getAttribute("aria-describedby")).toBe(hint.id);
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  // Given: a field with a hint and an error
  // When: it renders
  // Then: the input is marked invalid and described by both hint and error,
  //       and the error is announced as an alert.
  it("marks the control invalid and describes it with the error", () => {
    render(
      <Field label="Habit name" hint="Keep it short." error="Name is required.">
        <Input />
      </Field>,
    );

    const input = screen.getByRole("textbox", { name: "Habit name" });
    const error = screen.getByRole("alert");
    const hint = screen.getByText("Keep it short.");
    expect(error.textContent).toBe("Name is required.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(`${hint.id} ${error.id}`);
  });

  // Given: a required field with an explicit id
  // When: it renders a TextArea
  // Then: the explicit id is used and the control is required.
  it("honours an explicit id and the required flag", () => {
    render(
      <Field label="Notes" id="journal-notes" required>
        <TextArea />
      </Field>,
    );

    const textarea = screen.getByRole("textbox", { name: /Notes/ });
    expect(textarea.id).toBe("journal-notes");
    expect((textarea as HTMLTextAreaElement).required).toBe(true);
  });

  // Given: two fields on the same page
  // When: both render Selects
  // Then: each select gets a unique id and its own label.
  it("generates unique ids for sibling fields", () => {
    render(
      <>
        <Field label="Time of day">
          <Select>
            <option>Morning</option>
          </Select>
        </Field>
        <Field label="Frequency">
          <Select>
            <option>Daily</option>
          </Select>
        </Field>
      </>,
    );

    const time = screen.getByRole("combobox", { name: "Time of day" });
    const frequency = screen.getByRole("combobox", { name: "Frequency" });
    expect(time.id).not.toBe("");
    expect(time.id).not.toBe(frequency.id);
  });
});
