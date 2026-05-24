"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import { IconClose } from "@/components/Icons";
import { StaggerContainer, StaggerItem } from "@/components/motion/StaggerContainer";
import { useStoreContext } from "@/components/StoreProvider";

import styles from "./page.module.css";

/**
 * Identity — lets the user write a long-form identity statement, manage
 * core values as chips, and see a vote ledger that tallies habit
 * check-ins by identity label. Each habit check-in counts as one vote
 * for its associated identity.
 */
export default function IdentityPage() {
  const { habits, identity, setIdentity } = useStoreContext();
  const [editingStatement, setEditingStatement] = useState(false);
  const [statementDraft, setStatementDraft] = useState(identity.statement);
  const [newValue, setNewValue] = useState("");

  // Aggregate habit check-ins grouped by identity label, sorted descending.
  const ledger = useMemo(() => {
    const tally = new Map<string, number>();
    habits.forEach((habit) => {
      const votes = Object.keys(habit.history).filter((key) => Boolean(habit.history[key])).length;
      tally.set(habit.identity, (tally.get(habit.identity) ?? 0) + votes);
    });
    return Array.from(tally.entries()).sort((a, b) => b[1] - a[1]);
  }, [habits]);

  const total = ledger.reduce((sum, [, votes]) => sum + votes, 0);
  const max = Math.max(1, ...ledger.map(([, votes]) => votes));

  const addValue = () => {
    const value = newValue.trim();
    if (!value || identity.values.includes(value)) return;
    setIdentity({ ...identity, values: [...identity.values, value] });
    setNewValue("");
  };

  const removeValue = (value: string) => {
    setIdentity({ ...identity, values: identity.values.filter((item) => item !== value) });
  };

  const saveStatement = () => {
    if (statementDraft !== identity.statement) {
      setIdentity({ ...identity, statement: statementDraft });
    }
    setEditingStatement(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="page-header">
        <div>
          <div className="eyebrow">Become</div>
          <h1 className="h1">Identity</h1>
        </div>
      </div>

      <div className={styles.layout}>
        <section className="card card-pad">
          <div className="eyebrow">Statement</div>
          {editingStatement ? (
            <>
              <textarea
                className={`input ${styles.statementTextarea}`}
                rows={6}
                value={statementDraft}
                onChange={(event) => setStatementDraft(event.target.value)}
                autoFocus
              />
              <div className={styles.statementActions}>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    setStatementDraft(identity.statement);
                    setEditingStatement(false);
                  }}
                >
                  Cancel
                </button>
                <button className="btn btn-sm btn-primary" onClick={saveStatement}>
                  Save statement
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => {
                setStatementDraft(identity.statement);
                setEditingStatement(true);
              }}
              className={styles.statementDisplay}
            >
              {identity.statement.trim() ? (
                <>
                  <div className={styles.statementHint}>Click the statement to edit it.</div>
                  <p className={styles.statement}>{identity.statement}</p>
                </>
              ) : (
                <p className={styles.statementPlaceholder}>
                  No identity statement yet. Click this section to write one.
                </p>
              )}
            </button>
          )}
          <div className={`eyebrow ${styles.valuesHeader}`}>Core values</div>
          <StaggerContainer className={styles.valuesRow} staggerDelay={0.03}>
            {identity.values.map((value) => (
              <StaggerItem key={value}>
                <motion.button
                  className="chip active"
                  aria-label={`Remove core value ${value}`}
                  onClick={() => removeValue(value)}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>{value}</span>
                  <IconClose className={styles.chipClose} />
                </motion.button>
              </StaggerItem>
            ))}
            <input
              className={`input ${styles.addValueInput}`}
              value={newValue}
              onChange={(event) => setNewValue(event.target.value)}
              placeholder="+ Add value"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addValue();
                }
              }}
            />
            <motion.button className="chip" onClick={addValue} whileTap={{ scale: 0.95 }}>
              + Add
            </motion.button>
          </StaggerContainer>
        </section>

        <section className="card card-pad">
          <div className={styles.ledgerHeader}>
            <div>
              <div className="eyebrow">Vote ledger</div>
              <h2 className={`h3 ${styles.ledgerTitle}`}>Evidence by identity</h2>
            </div>
            <div className={`mono muted ${styles.ledgerTotal}`}>{total} TOTAL</div>
          </div>
          <StaggerContainer className={styles.ledgerList} staggerDelay={0.05}>
            {ledger.map(([label, votes]) => (
              <StaggerItem key={label}>
                <motion.div whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                  <div className={styles.ledgerRow}>
                    <div className={styles.ledgerLabel}>I am {label}</div>
                    <div className={`mono ${styles.ledgerVotes}`}>{votes}</div>
                  </div>
                  <div className={styles.ledgerBar}>
                    <motion.div
                      className={styles.ledgerBarFill}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((votes / max) * 100)}%` }}
                      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      </div>
    </motion.div>
  );
}
