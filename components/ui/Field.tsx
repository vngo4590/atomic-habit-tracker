"use client";

import {
  createContext,
  use,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import styles from "./Field.module.css";

/**
 * The ids a Field generates and hands to its control, so the label, hint and
 * error are announced together by screen readers without callers having to
 * invent or thread ids by hand.
 */
interface FieldContextValue {
  controlId: string;
  hintId?: string;
  errorId?: string;
  invalid: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export interface FieldProps {
  /** Visible label text (required — placeholders are not labels). */
  label: ReactNode;
  /** Helper text shown under the control. */
  hint?: ReactNode;
  /** Error text. When present the control is marked aria-invalid. */
  error?: ReactNode;
  /** Shows a required marker and sets `required` on the control. */
  required?: boolean;
  /** Override the generated control id (e.g. for e2e selectors). */
  id?: string;
  className?: string;
  /** Exactly one Input / TextArea / Select. */
  children: ReactNode;
}

/**
 * Field — wraps a form control with its label, hint and inline error and
 * wires them together: `<label for>`, `aria-describedby` (hint + error) and
 * `aria-invalid`. Errors render as role="alert" so they are announced as soon
 * as they appear, right next to the field that caused them.
 */
export function Field({ label, hint, error, required = false, id, className, children }: FieldProps) {
  const generated = useId();
  const controlId = id ?? `field-${generated}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;

  return (
    <FieldContext value={{ controlId, hintId, errorId, invalid: Boolean(error), required }}>
      <div className={[styles.field, className ?? ""].filter(Boolean).join(" ")}>
        <label className={styles.label} htmlFor={controlId}>
          {label}
          {required ? (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        {children}
        {hint ? (
          <p id={hintId} className={styles.hint}>
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </FieldContext>
  );
}

/**
 * Merge the Field's wiring into a control's own props. Explicit props from
 * the caller win, except aria-describedby which is concatenated so both the
 * caller's and the Field's descriptions are read.
 */
function useFieldControlProps(own: { id?: string; "aria-describedby"?: string; required?: boolean }) {
  const field = use(FieldContext);
  if (!field) {
    return {};
  }
  const describedBy = [own["aria-describedby"], field.hintId, field.errorId].filter(Boolean).join(" ") || undefined;
  return {
    id: own.id ?? field.controlId,
    "aria-describedby": describedBy,
    "aria-invalid": field.invalid || undefined,
    required: own.required ?? (field.required || undefined),
  };
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> };

/** Single-line text input. Use inside a <Field>. */
export function Input({ className, ...props }: InputProps) {
  const wiring = useFieldControlProps(props);
  return <input {...props} {...wiring} className={[styles.control, className ?? ""].filter(Boolean).join(" ")} />;
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> };

/** Multi-line text input. Use inside a <Field>. */
export function TextArea({ className, ...props }: TextAreaProps) {
  const wiring = useFieldControlProps(props);
  return (
    <textarea
      {...props}
      {...wiring}
      className={[styles.control, styles.textarea, className ?? ""].filter(Boolean).join(" ")}
    />
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> };

/** Native select (best mobile UX + accessibility for free). Use inside a <Field>. */
export function Select({ className, children, ...props }: SelectProps) {
  const wiring = useFieldControlProps(props);
  return (
    <select
      {...props}
      {...wiring}
      className={[styles.control, styles.select, className ?? ""].filter(Boolean).join(" ")}
    >
      {children}
    </select>
  );
}
