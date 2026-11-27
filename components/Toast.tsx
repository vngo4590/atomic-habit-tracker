"use client";

import { useEffect } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { clientLogger } from "@/lib/logger-client";

export function Toast() {
  const { toast } = useStoreContext();

  useEffect(() => {
    if (!toast) {
      return;
    }

    const isErrorToast = /couldn't|error|failed/i.test([toast.msg, toast.sub].filter(Boolean).join(" "));
    clientLogger.info("Toast displayed", {
      event: "toast.display",
      type: toast.sub ? "detailed" : "plain",
      isErrorToast,
    });
  }, [toast]);

  // The wrapper is a persistent polite live region: it must exist before the
  // toast text appears so screen readers announce each new message without
  // interrupting what they're currently reading. `.toast` itself is fixed-
  // positioned, so this unstyled wrapper doesn't affect layout.
  // Keying on the toast id replays the CSS enter animation for each new toast;
  // CSS (not Framer Motion) keeps the animation runtime out of the app shell.
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {toast && (
        <div className="toast" key={toast.id}>
          <span>{toast.msg}</span>
          {toast.sub && <em>{toast.sub}</em>}
        </div>
      )}
    </div>
  );
}
