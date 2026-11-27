"use client";

import { Fingerprint } from "lucide-react";
import { useEffect } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { PageHeader } from "@/components/ui";
import { clientLogger } from "@/lib/logger-client";

import { CoreValues } from "./CoreValues";
import { IdentityStatement } from "./IdentityStatement";
import { VoteLedger } from "./VoteLedger";
import styles from "./IdentityView.module.css";

/**
 * IdentityView — the /identity page: who you want to be (statement and core
 * values) beside the evidence for it (every check-in is a vote for the
 * identity of its habit).
 */
export function IdentityView() {
  const { habits, identity, setIdentity } = useStoreContext();

  useEffect(() => {
    clientLogger.info("Page viewed", { page: "identity" });
  }, []);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Identity"
        subtitle="Every check-in is a vote for the person you're becoming."
        eyebrow={
          <span className={styles.eyebrow}>
            <Fingerprint size={14} strokeWidth={1.75} aria-hidden="true" />
            Who you&apos;re becoming
          </span>
        }
      />
      <div className={styles.layout}>
        <div className={styles.column}>
          <IdentityStatement
            statement={identity.statement}
            onSave={(statement) => setIdentity({ ...identity, statement })}
          />
          <CoreValues values={identity.values} onChange={(values) => setIdentity({ ...identity, values })} />
        </div>
        <VoteLedger habits={habits} />
      </div>
    </div>
  );
}
