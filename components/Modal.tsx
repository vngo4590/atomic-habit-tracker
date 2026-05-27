"use client";

/**
 * Modal — lightweight dialog used for confirmations and blocking error
 * messages. Originally built for stack-mutation failures where the user
 * must acknowledge that the operation was cancelled.
 *
 * Behaviour:
 *  • Mounted/unmounted via Framer's <AnimatePresence> for smooth fade-in
 *    and fade-out.
 *  • Auto-focuses the primary action button so Enter dismisses it.
 *  • Dismissible via Escape key, backdrop click, or the OK button.
 *
 * Styling: see Modal.module.css — no inline styles, only dynamic data
 * (the `tone` prop) selects between two title-colour classes.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";

import { clientLogger } from "@/lib/logger-client";

import styles from "./Modal.module.css";

export type ModalTone = "info" | "error";

export interface ModalProps {
  /** Whether the modal is visible. When false the dialog is unmounted. */
  open: boolean;
  /** Heading shown at the top of the card. */
  title: string;
  /** Body text describing the situation to the user. */
  message: string;
  /** Called when the user dismisses the modal (Escape, backdrop, button). */
  onClose: () => void;
  /** "error" tints the title red. Defaults to "info". */
  tone?: ModalTone;
  /** Label for the primary acknowledgement button. Defaults to "OK". */
  primaryLabel?: string;
}

export function Modal({
  open,
  title,
  message,
  onClose,
  tone = "info",
  primaryLabel = "OK",
}: ModalProps) {
  const previousOpen = useRef(false);

  const handleClose = useCallback((reason: "backdrop" | "escape" | "primary") => {
    clientLogger.info("Modal closed", {
      event: "modal.close",
      tone,
      reason,
    });
    onClose();
  }, [onClose, tone]);

  // Log when the dialog becomes visible so open/close flows can be traced in dev.
  useEffect(() => {
    if (open && !previousOpen.current) {
      clientLogger.info("Modal opened", {
        event: "modal.open",
        tone,
      });
    }
    previousOpen.current = open;
  }, [open, tone]);

  // Wire up Escape-to-close while the modal is visible. The listener is
  // removed when the modal closes or unmounts to avoid lingering handlers.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose("escape");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-message"
          data-testid="modal"
          className={styles.root}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop — clicking it dismisses the modal. */}
          <motion.div
            onClick={() => handleClose("backdrop")}
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          {/* The dialog card itself. Layers our Modal.module.css class on
              top of the shared .card / .card-pad utility classes so it
              picks up the editorial border + padding tokens. */}
          <motion.div
            className={`card card-pad ${styles.card}`}
            data-testid="modal-card"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <div
              id="modal-title"
              className={`h3 ${styles.title} ${tone === "error" ? styles.titleError : ""}`}
            >
              {title}
            </div>
            <p id="modal-message" className={styles.message}>
              {message}
            </p>
            <div className={styles.actions}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleClose("primary")}
                autoFocus
                data-testid="modal-primary"
              >
                {primaryLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
