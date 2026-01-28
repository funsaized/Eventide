"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Trash2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-view">Default View</Label>
            <Select defaultValue="dashboard">
              <SelectTrigger id="default-view">
                <SelectValue placeholder="Select default view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dashboard">Dashboard</SelectItem>
                <SelectItem value="trades">Trade Journal</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose which page to show when you open the app
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Storage indicator placeholder */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Storage Used</span>
              <span className="font-mono">-- MB / -- MB</span>
            </div>
            <div className="h-2 rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: "0%" }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Storage indicator will be implemented in Phase 14
            </p>
          </div>

          {/* Export Database */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">Export Database</p>
              <p className="text-sm text-muted-foreground">
                Download your SQLite database file
              </p>
            </div>
            <Button variant="outline" className="gap-2" disabled>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Import History placeholder */}
          <div className="rounded-lg border border-border p-4">
            <p className="font-medium">Import History</p>
            <p className="text-sm text-muted-foreground">
              Import history will be implemented in Phase 14
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
            <div>
              <p className="font-medium">Delete All Data</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete all imported statements and trades
              </p>
            </div>
            <Button variant="destructive" className="gap-2" disabled>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Version */}
      <div className="text-center text-sm text-muted-foreground">
        Rubbin Hood v0.1.0
      </div>
    </div>
  );
}
