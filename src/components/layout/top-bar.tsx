"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileSidebar } from "./sidebar";

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Mobile menu trigger */}
      <MobileSidebar />

      {/* Page title */}
      <h1 className="flex-1 text-lg font-semibold tracking-tight">{title}</h1>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Upload Statement</span>
        </Button>
      </div>
    </header>
  );
}
