import type { ReactNode } from "react";

import { AppearanceSync } from "@/components/AppearanceSync";
import { ClickFX } from "@/components/ClickFX";
import { Nav } from "@/components/Nav";
import { OnboardingGate } from "@/components/OnboardingGate";
import { PageTransition } from "@/components/motion/PageTransition";
import { StoreProvider } from "@/components/StoreProvider";
import { Toast } from "@/components/Toast";
import { requireCurrentUser } from "@/lib/auth/session";
import { todayKey } from "@/lib/helpers";
import { logger, redactUserId } from "@/lib/logger";
import { getStoreSnapshot } from "@/lib/repositories/reflection";

const log = logger.child({ module: "layout.root" });

export default async function RootGroupLayout({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser();

  log.debug("Loading store snapshot", {
    event: "layout.snapshot.loading",
    userId: redactUserId(user.id),
  });

  const backendSnapshot = await (async () => {
    try {
      const snapshot = await getStoreSnapshot(user.id, todayKey());
      log.debug("Store snapshot loaded", {
        event: "layout.snapshot.loaded",
        userId: redactUserId(user.id),
      });
      return snapshot;
    } catch (error) {
      log.error("Failed to load store snapshot", {
        event: "layout.snapshot.failed",
        userId: redactUserId(user.id),
        error,
      });
      throw error;
    }
  })();

  return (
    <StoreProvider backendSnapshot={backendSnapshot}>
      <AppearanceSync />
      <ClickFX />
      <div className="app">
        <Nav user={{ name: user.name, email: user.email }} />
        <main className="main">
          <div className="main-inner">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
        <OnboardingGate />
        <Toast />
      </div>
    </StoreProvider>
  );
}
