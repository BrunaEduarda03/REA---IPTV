import type { PropsWithChildren } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function PageShell({ children }: PropsWithChildren) {
  return (
    <div className="flex h-dvh overflow-hidden bg-surface-base">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-gutter">{children}</main>
      </div>
    </div>
  );
}
