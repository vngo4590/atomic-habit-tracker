import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Nav } from "@/components/Nav";
import { OnboardingGate } from "@/components/OnboardingGate";
import { StoreProvider } from "@/components/StoreProvider";
import { Toast } from "@/components/Toast";

export default async function RootGroupLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <StoreProvider>
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
