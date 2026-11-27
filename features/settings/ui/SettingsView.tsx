"use client";

import { useEffect } from "react";

import { PageHeader } from "@/components/ui";
import { clientLogger } from "@/lib/logger-client";

import { AccountSection } from "./AccountSection";
import { AppearanceSection } from "./AppearanceSection";
import { DataSection } from "./DataSection";
import { IdentitySection } from "./IdentitySection";
import { PreferencesSection } from "./PreferencesSection";
import { ProfileSection } from "./ProfileSection";
import { useSessionUser } from "./useSessionUser";
import styles from "./SettingsView.module.css";

/** Section anchors, in page order, for the desktop section nav. */
export const SETTINGS_SECTIONS = [
  { id: "profile", label: "Profile & account" },
  { id: "appearance", label: "Appearance" },
  { id: "preferences", label: "Preferences" },
  { id: "data", label: "Data" },
  { id: "identity", label: "Identity" },
  { id: "account", label: "Sign out" },
] as const;

/**
 * SettingsView — the Settings page: a section nav (desktop) beside a single
 * column of grouped cards. Each section owns its own state and saves; this
 * component only loads the session profile and lays the sections out.
 */
export function SettingsView() {
  const { user, status, setUser, retry } = useSessionUser();

  useEffect(() => {
    clientLogger.info("Page viewed", { page: "settings" });
  }, []);

  return (
    <div className={styles.page}>
      <PageHeader eyebrow="You" title="Settings" subtitle="Your profile, how Atomicly looks, and your data." />

      <div className={styles.layout}>
        <nav className={styles.sectionNav} aria-label="Settings sections">
          <ul className={styles.navList}>
            {SETTINGS_SECTIONS.map((section) => (
              <li key={section.id}>
                <a className={styles.navLink} href={`#${section.id}`}>
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.sections}>
          <ProfileSection
            user={user}
            status={status}
            onRetry={retry}
            onNameSaved={(name) => setUser((previous) => (previous ? { ...previous, name } : previous))}
          />
          <AppearanceSection />
          <PreferencesSection />
          <DataSection />
          <IdentitySection />
          <AccountSection />
        </div>
      </div>
    </div>
  );
}
