import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui";

import { SettingRow, SettingsSection } from "./SettingsSection";

/**
 * IdentitySection — the "who you're becoming" statements are no longer a
 * top-level nav item (ADR-0003), so Settings links to them.
 */
export function IdentitySection() {
  return (
    <SettingsSection id="identity" title="Identity" description="The person your habits are helping you become.">
      <SettingRow
        label="Identity statements"
        hint="Review and edit who you're becoming."
        action={
          <Button href="/identity" variant="secondary" size="sm" icon={<ArrowRight />}>
            Open identity
          </Button>
        }
      />
    </SettingsSection>
  );
}
