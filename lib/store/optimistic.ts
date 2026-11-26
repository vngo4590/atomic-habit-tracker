/**
 * One shared recipe for optimistic writes in the client store.
 *
 * Every store mutation follows the same steps:
 *   1. apply the change locally so the UI updates instantly,
 *   2. call the server action,
 *   3. on success, reconcile local state with the server's answer,
 *   4. on failure (thrown error or an `{ ok: false }` style refusal), restore
 *      the pre-mutation state, log a warning and optionally show a toast.
 *
 * Keeping this in one function means rollback, logging and user feedback
 * behave the same for every feature slice.
 */

import { clientLogger } from "@/lib/logger-client";

/** Signature of the store's toast trigger (`showToast(msg, sub?)`). */
export type ShowToast = (msg: string, sub?: string) => void;

/** Reduce repeated unknown-error handling to a safe, non-sensitive message. */
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error.";
}

/** Report which allowlisted fields are changing without logging their values. */
export function changedFields(patch: object) {
  return Object.keys(patch).sort();
}

export interface OptimisticMutation<T> {
  /**
   * Apply the optimistic change. Return a function that restores the
   * pre-mutation state, or nothing when the change should stay in place even
   * if the server call fails.
   */
  apply?: () => (() => void) | void;
  /** Call the server action. */
  action: () => Promise<T>;
  /** Reconcile local state with the server result. */
  onSuccess?: (result: T) => void;
  /** Detect a non-throwing refusal such as `{ ok: false }`. */
  isRefused?: (result: T) => boolean;
  /** Runs after the rollback when `isRefused` returned true (e.g. explain why). */
  onRefused?: (result: T) => void;
  /** How to report a failure (the action threw, or reconciling threw). */
  failure: {
    /** Human-readable log message. */
    log: string;
    /** Structured log event name, e.g. `store.habit.toggle_failed`. */
    event: string;
    /** Extra non-sensitive log context. */
    context?: Record<string, unknown>;
    /** When set, show a toast with this title and the error message as subtitle. */
    toast?: string;
  };
  showToast?: ShowToast;
  /** Re-throw a thin `Error(message)` so the caller can show its own dialog. */
  rethrow?: boolean;
}

/**
 * Run an optimistic mutation. Resolves with the server result, or `undefined`
 * when it failed (unless `rethrow` is set). The `apply` step and the action
 * call both happen synchronously, before the first `await`, so the UI and any
 * spies see them immediately.
 */
export async function optimistic<T>(mutation: OptimisticMutation<T>): Promise<T | undefined> {
  const rollback = mutation.apply?.() ?? undefined;

  try {
    const result = await mutation.action();
    if (mutation.isRefused?.(result)) {
      rollback?.();
      mutation.onRefused?.(result);
      return result;
    }
    mutation.onSuccess?.(result);
    return result;
  } catch (error: unknown) {
    rollback?.();
    const message = errorMessage(error);
    clientLogger.warn(mutation.failure.log, {
      event: mutation.failure.event,
      ...mutation.failure.context,
      message,
    });
    if (mutation.failure.toast) {
      mutation.showToast?.(mutation.failure.toast, message);
    }
    if (mutation.rethrow) {
      throw new Error(message);
    }
    return undefined;
  }
}
