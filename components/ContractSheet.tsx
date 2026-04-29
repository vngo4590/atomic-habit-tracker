"use client";

import { useState } from "react";

import { IconClose } from "@/components/Icons";
import type { Habit } from "@/lib/types";

export function ContractSheet({
  habit,
  onClose,
  onSave,
}: {
  habit: Habit;
  onClose: () => void;
  onSave: (patch: Pick<Habit, "contract" | "contractPartners">) => void;
}) {
  const [contract, setContract] = useState(habit.contract);
  const [partners, setPartners] = useState(habit.contractPartners.join(", "));

  return (
    <div className="overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="overlay-card fade-up" onClick={(event) => event.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 24 }}>
          <div>
            <div className="eyebrow">Accountability</div>
            <h2 className="h2">Contract</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <IconClose style={{ width: 13, height: 13 }} />
          </button>
        </div>
        <div style={{ marginTop: 22 }}>
          <label className="field-label" htmlFor="contract-terms">Terms</label>
          <textarea id="contract-terms" className="input" rows={4} value={contract} onChange={(event) => setContract(event.target.value)} placeholder="If I miss two days, I..." />
        </div>
        <div style={{ marginTop: 16 }}>
          <label className="field-label" htmlFor="contract-partners">Partners</label>
          <input id="contract-partners" className="input" value={partners} onChange={(event) => setPartners(event.target.value)} placeholder="Mira, Sam, accountability@example.com" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onSave({
                contract: contract.trim(),
                contractPartners: partners.split(",").map((partner) => partner.trim()).filter(Boolean),
              });
              onClose();
            }}
          >
            Save contract
          </button>
        </div>
      </div>
    </div>
  );
}
