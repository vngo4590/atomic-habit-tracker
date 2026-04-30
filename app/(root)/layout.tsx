import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Nav } from "@/components/Nav";
import { OnboardingGate } from "@/components/OnboardingGate";
import { StoreProvider } from "@/components/StoreProvider";
import { Toast } from "@/components/Toast";
import { todayKey } from "@/lib/helpers";
import { getStoreSnapshot } from "@/lib/repositories/reflection";

export default async function RootGroupLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id;
  const initialSnapshot = await getStoreSnapshot(userId, todayKey());

  return (
    <StoreProvider initialSnapshot={initialSnapshot}>
      <div className="app">
        <Nav user={{ name: session.user.name ?? null, email: session.user.email ?? null }} />
        <main className="main">
          <div className="main-inner">{children}</div>
        </main>
        <OnboardingGate />
        <Toast />
      </div>
    </StoreProvider>
  );
}
