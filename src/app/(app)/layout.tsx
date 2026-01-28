"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/trades": "Trade Journal",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Rubbin Hood";

  return <AppShell title={title}>{children}</AppShell>;
}
