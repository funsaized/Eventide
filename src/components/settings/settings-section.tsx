"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  variant?: "default" | "danger";
}

export function SettingsSection({
  title,
  description,
  children,
  variant = "default",
}: SettingsSectionProps) {
  return (
    <Card className={variant === "danger" ? "border-destructive/50" : undefined}>
      <CardHeader>
        <CardTitle className={variant === "danger" ? "text-destructive" : undefined}>
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
