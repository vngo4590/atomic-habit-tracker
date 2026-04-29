import type { ReactNode } from "react";

import { Nav } from "@/components/Nav";
import { StoreProvider } from "@/components/StoreProvider";
import { Toast } from "@/components/Toast";

export default function RootGroupLayout({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <div className="app">
        <Nav />
        <main className="main">
          <div className="main-inner">{children}</div>
        </main>
        <Toast />
      </div>
    </StoreProvider>
  );
}
