import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import styles from "./IconButton.module.css";

interface IconButtonBaseProps {
  /**
   * Required accessible name. An icon alone conveys nothing to screen-reader
   * users, so the type system forces every icon button to be labelled.
   */
  "aria-label": string;
  /** The Lucide icon to show. It is marked decorative automatically. */
  icon: ReactNode;
  /** "ghost" (default) is borderless; "secondary" adds a subtle border. */
  variant?: "ghost" | "secondary";
  className?: string;
}

type IconButtonAsButton = IconButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> & {
    href?: undefined;
    ref?: Ref<HTMLButtonElement>;
  };

type IconButtonAsLink = IconButtonBaseProps & {
  /** Render as a Next.js <Link> (e.g. the avatar → Settings shortcut). */
  href: string;
  ref?: Ref<HTMLAnchorElement>;
  "aria-current"?: "page" | undefined;
};

export type IconButtonProps = IconButtonAsButton | IconButtonAsLink;

/**
 * IconButton — square icon-only button with a mandatory `aria-label`.
 * Used for toolbar actions (close, more, add) and the mobile top bar.
 */
export function IconButton(props: IconButtonProps) {
  const variantClass = props.variant === "secondary" ? styles.secondary : "";
  const className = [styles.iconButton, variantClass, props.className ?? ""].filter(Boolean).join(" ");
  const glyph = <span aria-hidden="true">{props.icon}</span>;

  if (props.href !== undefined) {
    // Destructure first so the ref is passed through without the props
    // object (which holds it) being read during render.
    const { href, ref, "aria-label": label, "aria-current": current } = props;
    return (
      <Link href={href} ref={ref} className={className} aria-label={label} aria-current={current}>
        {glyph}
      </Link>
    );
  }

  const { icon: _icon, variant: _variant, className: _className, type = "button", ...rest } = props;
  void _icon;
  void _variant;
  void _className;
  return (
    <button type={type} {...rest} className={className}>
      {glyph}
    </button>
  );
}
