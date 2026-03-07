"use client";

import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { useDemoInit } from "@/hooks/use-demo-mode";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
}

export function AppShell({ children, title }: AppShellProps) {
  // Initialize demo mode on first visit (seeds data if DB is empty)
  useDemoInit();
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar title={title} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
