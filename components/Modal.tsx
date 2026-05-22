"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

/**
 * Lightweight modal/dialog used for confirmation and blocking error messages.
 * Designed for stack-mutation failures where the user must acknowledge that
 * the operation was cancelled. Auto-focuses the primary action and supports
 * dismissal via Escape, the backdrop, or the explicit OK button.
 */
export function Modal({
  open,
  title,
  message,
  onClose,
  tone = "info",
  primaryLabel = "OK",
}: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  tone?: "info" | "error";
  primaryLabel?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-message"
          data-testid="modal"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            onClick={onClose}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(2px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="card card-pad"
            data-testid="modal-card"
            style={{
              position: "relative",
              maxWidth: 420,
              width: "100%",
              background: "var(--bg-elev)",
              borderRadius: 12,
              boxShadow: "var(--shadow-lg)",
              padding: "22px 22px 18px",
            }}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <div
              id="modal-title"
              className="h3"
              style={{
                margin: 0,
                color: tone === "error" ? "oklch(60% 0.12 30)" : "var(--ink)",
              }}
            >
              {title}
            </div>
            <p
              id="modal-message"
              style={{
                marginTop: 8,
                marginBottom: 18,
                color: "var(--ink-2)",
                fontSize: 14,
                lineHeight: 1.45,
              }}
            >
              {message}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={onClose}
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
