"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { toastVariants } from "@/lib/animations";
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

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          className="toast"
          key={toast.id}
          variants={toastVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          layout
        >
          <span>{toast.msg}</span>
          {toast.sub && <em>{toast.sub}</em>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
