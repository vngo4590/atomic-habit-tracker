"use client";

import { useState } from "react";

import { IconClose } from "@/components/Icons";
import type { Habit } from "@/lib/types";

import styles from "./ContractSheet.module.css";

/**
 * ContractSheet — accountability contract editor shown on a habit detail
 * page. Users write a "consequence" sentence ("If I miss two days, I…")
 * and a comma-separated list of accountability partners. Save commits
 * both fields; cancel discards the local draft.
 */
export function ContractSheet({
  habit,
  onClose,
  onSave,
}: {
  habit: Habit;
  onClose: () => void;
  onSave: (patch: Pick<Habit, "contract" | "contractPartners">) => void;
}) {
  // Local draft state — the parent only receives the change on save.
  const [contract, setContract] = useState(habit.contract);
  const [partners, setPartners] = useState(habit.contractPartners.join(", "));

  return (
    <div className="overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="overlay-card fade-up" onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <div className="eyebrow">Accountability</div>
            <h2 className="h2">Contract</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <IconClose className={styles.closeIcon} />
          </button>
        </div>
        <div className={styles.termsSection}>
          <label className="field-label" htmlFor="contract-terms">Terms</label>
          <textarea
            id="contract-terms"
            className="input"
            rows={4}
            value={contract}
            onChange={(event) => setContract(event.target.value)}
            placeholder="If I miss two days, I..."
          />
        </div>
        <div className={styles.partnersSection}>
          <label className="field-label" htmlFor="contract-partners">Partners</label>
          <input
            id="contract-partners"
            className="input"
            value={partners}
            onChange={(event) => setPartners(event.target.value)}
            placeholder="Mira, Sam, accountability@example.com"
          />
        </div>
        <div className={styles.actions}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              // Trim the contract sentence and split partners on commas so
              // empty entries (from "Sam, , Mira") are discarded.
              onSave({
                contract: contract.trim(),
                contractPartners: partners
                  .split(",")
                  .map((partner) => partner.trim())
                  .filter(Boolean),
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
