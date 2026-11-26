/**
 * Stack-specific error codes returned by domain mutations. Each code maps to
 * a user-facing message that the UI uses in modal dialogs. Server actions and
 * API routes throw `StackError` so both call sites can surface the same
 * message without lossy string sniffing.
 */
export type StackErrorCode =
  | "self_reference"
  | "circular_stack"
  | "target_in_other_stack"
  | "source_in_other_stack"
  | "habit_not_found"
  | "target_not_found"
  | "invalid_reorder";

export class StackError extends Error {
  readonly code: StackErrorCode;

  constructor(code: StackErrorCode, message: string) {
    super(message);
    this.name = "StackError";
    this.code = code;
  }
}

export const STACK_ERROR_MESSAGES: Record<StackErrorCode, string> = {
  self_reference: "A habit cannot stack with itself.",
  circular_stack: "This would create a circular stack.",
  target_in_other_stack: "This habit is already in another stack. Remove it first.",
  source_in_other_stack: "This habit is already in another stack. Remove it first.",
  habit_not_found: "Habit was not found.",
  target_not_found: "Target habit was not found.",
  invalid_reorder: "Reorder must include exactly the habits in this stack.",
};

export function makeStackError(code: StackErrorCode) {
  return new StackError(code, STACK_ERROR_MESSAGES[code]);
}

export function isStackError(error: unknown): error is StackError {
  return error instanceof StackError;
}
