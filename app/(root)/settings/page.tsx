import { SettingsView } from "@/features/settings/ui";

/**
 * `/settings` — thin route shell. The page UI (profile, appearance,
 * preferences, data, identity link, sign out) lives in
 * `features/settings/ui`.
 */
export default function SettingsPage() {
  return <SettingsView />;
}
