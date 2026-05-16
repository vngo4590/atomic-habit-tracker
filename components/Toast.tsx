"use client";

import { AnimatePresence, motion } from "framer-motion";

import { useStoreContext } from "@/components/StoreProvider";
import { toastVariants } from "@/lib/animations";

export function Toast() {
  const { toast } = useStoreContext();

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
