import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from "react";

import styles from "./Button.module.css";

/** Visual intent. One `primary` per screen (MASTER: one thing per screen). */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
/** md = default 44px touch target; sm = dense rows (still 44px on touch). */
export type ButtonSize = "sm" | "md";

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Optional leading Lucide icon (decorative — hidden from screen readers). */
  icon?: ReactNode;
  /** Stretch to the container width (e.g. the sidebar "New habit" button). */
  fullWidth?: boolean;
  children?: ReactNode;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
    href?: undefined;
    /** Shows a spinner, disables the button and announces aria-busy. */
    loading?: boolean;
    ref?: Ref<HTMLButtonElement>;
  };

type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "href"> & {
    /** When set the button renders as a Next.js <Link> (client navigation). */
    href: string;
    loading?: never;
    ref?: Ref<HTMLAnchorElement>;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

// Props consumed by Button itself; everything else is forwarded to the DOM.
const OWN_PROPS = new Set(["variant", "size", "icon", "fullWidth", "children", "className", "loading", "href"]);

/** Copy every prop that Button doesn't consume, for spreading onto the DOM. */
function domProps<T extends object>(props: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(props).filter(([key]) => !OWN_PROPS.has(key)));
}

/** Class list shared by the <button> and <Link> renderings (and reusable by
 *  callers that need a button-looking element of another kind). */
export function buttonClassName({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: Pick<CommonProps, "variant" | "size" | "fullWidth"> & { className?: string }) {
  return [styles.button, styles[variant], styles[size], fullWidth ? styles.fullWidth : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
}

/**
 * Button — the app's single button primitive.
 *
 * Renders a native <button> by default, or a Next.js <Link> when `href` is
 * given so navigation buttons stay real links (middle-click, prefetch,
 * correct semantics). `loading` keeps the label in the layout (no width jump),
 * overlays a spinner, disables the control and sets aria-busy so assistive
 * tech knows work is in progress.
 */
export function Button(props: ButtonProps) {
  const { variant, size, icon, fullWidth, children, className } = props;
  const classes = buttonClassName({ variant, size, fullWidth, className });
  const loading = props.href === undefined && Boolean(props.loading);

  const content = (
    <span className={`${styles.content} ${loading ? styles.contentHidden : ""}`}>
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );

  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={classes} {...domProps(props)}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      {...domProps(props)}
      className={classes}
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
    >
      {content}
      {loading && <span className={styles.spinner} aria-hidden="true" />}
    </button>
  );
}
