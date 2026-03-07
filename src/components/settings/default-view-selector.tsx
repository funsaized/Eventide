"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserPreferencesStore } from "@/lib/state/stores";

const VIEW_OPTIONS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "trades", label: "Trade Journal" },
  { value: "analytics", label: "Analytics" },
] as const;

export function DefaultViewSelector() {
  const defaultView = useUserPreferencesStore((s) => s.defaultView);
  const setDefaultView = useUserPreferencesStore((s) => s.setDefaultView);

  return (
    <div className="space-y-2">
      <Label htmlFor="default-view">Default View</Label>
      <Select
        value={defaultView}
        onValueChange={(v) =>
          setDefaultView(v as "dashboard" | "trades" | "analytics")
        }
      >
        <SelectTrigger id="default-view">
          <SelectValue placeholder="Select default view" />
        </SelectTrigger>
        <SelectContent>
          {VIEW_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Choose which page to show when you open the app
      </p>
    </div>
  );
}
