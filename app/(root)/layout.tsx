import type { ReactNode } from "react";

import { AppearanceSync } from "@/components/AppearanceSync";
import { Nav } from "@/components/Nav";
import { OnboardingGate } from "@/components/OnboardingGate";
import { StoreProvider } from "@/components/StoreProvider";
import { Toast } from "@/components/Toast";
import { requireCurrentUser } from "@/lib/auth/session";
import { todayKey } from "@/lib/helpers";
import { getStoreSnapshot } from "@/lib/repositories/reflection";

export default async function RootGroupLayout({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser();
  const backendSnapshot = await getStoreSnapshot(user.id, todayKey());

  return (
    <StoreProvider backendSnapshot={backendSnapshot}>
      <AppearanceSync />
      <div className="app">
        <Nav user={{ name: user.name, email: user.email }} />
        <main className="main">
          <div className="main-inner">{children}</div>
        </main>
        <OnboardingGate />
        <Toast />
      </div>
    </StoreProvider>
  );
}
