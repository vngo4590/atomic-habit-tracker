import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./Switch.module.css";

export interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "role" | "aria-checked" | "children"> {
  /** Current state (controlled). */
  checked: boolean;
  /** Called with the next state when the user toggles. */
  onCheckedChange: (checked: boolean) => void;
  /** Visible label; omit only when the switch is labelled by aria-label. */
  children?: ReactNode;
}

/**
 * Switch — accessible on/off toggle (`role="switch"` + `aria-checked`).
 * Space/Enter toggle it for free because it is a native <button>. Use for
 * settings that apply immediately; use a checkbox inside forms instead.
 */
export function Switch({ checked, onCheckedChange, children, className, onClick, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={[styles.switch, className ?? ""].filter(Boolean).join(" ")}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          onCheckedChange(!checked);
        }
      }}
      {...rest}
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      {children}
    </button>
  );
}
