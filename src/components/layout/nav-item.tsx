"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
}

export function NavItem({ href, icon: Icon, label }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Button
      variant="ghost"
      asChild
      className={cn(
        "w-full justify-start gap-3 px-3 py-2 text-muted-foreground transition-colors",
        isActive && "bg-accent text-foreground"
      )}
    >
      <Link href={href}>
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </Link>
    </Button>
  );
}
