"use client";

import { useEffect } from "react";

import { useStoreContext } from "@/components/StoreProvider";

export function Toast() {
  const { toast } = useStoreContext();

  useEffect(() => undefined, [toast]);

  if (!toast) {
    return null;
  }

  return (
    <div className="toast fade-up" key={toast.id}>
      <span>{toast.msg}</span>
      {toast.sub && <em>{toast.sub}</em>}
    </div>
  );
}
