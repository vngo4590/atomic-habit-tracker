import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PasswordInput } from "@/components/PasswordInput";

afterEach(() => cleanup());

describe("PasswordInput", () => {
  // Given: a freshly rendered password input
  // When: nothing has been clicked yet
  // Then: the value is masked (type=password) and the toggle offers to show it.
  it("conceals the password by default and labels the toggle 'Show password'", () => {
    render(<PasswordInput name="password" aria-label="Password" />);

    const field = screen.getByLabelText("Password") as HTMLInputElement;
    expect(field.type).toBe("password");
    expect(screen.getByRole("button", { name: "Show password" })).toBeTruthy();
  });

  // Given: a concealed password input
  // When: the user activates the toggle
  // Then: the value becomes visible (type=text) and the label flips to 'Hide password'.
  it("reveals the password when the toggle is activated", () => {
    render(<PasswordInput name="password" aria-label="Password" />);

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));

    const field = screen.getByLabelText("Password") as HTMLInputElement;
    expect(field.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeTruthy();
  });

  // Given: a revealed password input
  // When: the user activates the toggle again
  // Then: the value is concealed again and the label returns to 'Show password'.
  it("conceals the password again on a second activation", () => {
    render(<PasswordInput name="password" aria-label="Password" />);

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));

    const field = screen.getByLabelText("Password") as HTMLInputElement;
    expect(field.type).toBe("password");
    expect(screen.getByRole("button", { name: "Show password" })).toBeTruthy();
  });

  // Given: the toggle is rendered inside a <form>
  // When: the toggle is clicked
  // Then: it is type="button" and does NOT submit the surrounding form.
  it("does not submit the surrounding form when toggled", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <PasswordInput name="password" aria-label="Password" />
      </form>,
    );

    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle.getAttribute("type")).toBe("button");

    fireEvent.click(toggle);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  // Given: two password inputs on the same page
  // When: the user reveals only the first
  // Then: the first becomes visible while the second stays masked (independent state).
  it("manages each field's visibility independently", () => {
    render(
      <>
        <PasswordInput name="current" aria-label="Current" />
        <PasswordInput name="next" aria-label="Next" />
      </>,
    );

    const toggles = screen.getAllByRole("button", { name: "Show password" });
    fireEvent.click(toggles[0]);

    const current = screen.getByLabelText("Current") as HTMLInputElement;
    const next = screen.getByLabelText("Next") as HTMLInputElement;
    expect(current.type).toBe("text");
    expect(next.type).toBe("password");
  });
});
