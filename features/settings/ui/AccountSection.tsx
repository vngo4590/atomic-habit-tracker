"use client";

import { LogOut, ShieldOff } from "lucide-react";

import { Button } from "@/components/ui";
import { logoutAction, signOutEverywhereAction } from "@/lib/actions/auth";
import { clientLogger } from "@/lib/logger-client";

import { SettingRow, SettingsSection } from "./SettingsSection";

/**
 * AccountSection — the session "danger zone": sign out of this device, or of
 * every device (advances the revocation cutoff so all existing sessions are
 * invalidated). Lives here as well as in the desktop sidebar because the
 * mobile shell has no sidebar footer.
 */
export function AccountSection() {
  return (
    <SettingsSection id="account" title="Sign out" description="End sessions on this device or everywhere." danger>
      <SettingRow
        label="This device"
        hint="Sign out of Atomicly here."
        action={
          <form
            action={logoutAction}
            onSubmit={() => clientLogger.info("Logout submitted", { event: "nav.logout", source: "settings" })}
          >
            <Button type="submit" variant="secondary" size="sm" icon={<LogOut />}>
              Sign out
            </Button>
          </form>
        }
      />
      <SettingRow
        label="All devices"
        hint="Use this if you lost a device or signed in somewhere public."
        action={
          <form
            action={signOutEverywhereAction}
            onSubmit={(event) => {
              if (!window.confirm("Sign out of Atomicly on every device, including this one?")) {
                event.preventDefault();
                return;
              }
              clientLogger.info("Sign out everywhere submitted", { page: "settings" });
            }}
          >
            <Button type="submit" variant="danger" size="sm" icon={<ShieldOff />}>
              Sign out all devices
            </Button>
          </form>
        }
      />
    </SettingsSection>
  );
}
