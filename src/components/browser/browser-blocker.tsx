"use client";

/**
 * Browser Blocker Component
 *
 * Shows a full-screen overlay for non-Chromium browsers.
 * OPFS (Origin Private File System) is only supported in Chromium browsers.
 */

import { useEffect, useState } from "react";
import { AlertCircle, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BrowserInfo {
  isChromium: boolean;
  browserName: string;
}

/**
 * Detect if the browser is Chromium-based
 */
function detectBrowser(): BrowserInfo {
  if (typeof navigator === "undefined") {
    return { isChromium: true, browserName: "Unknown" };
  }

  const ua = navigator.userAgent;

  // Safari (not Chromium)
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    return { isChromium: false, browserName: "Safari" };
  }

  // Firefox
  if (/Firefox/.test(ua)) {
    return { isChromium: false, browserName: "Firefox" };
  }

  // Edge (Chromium-based since 2020)
  if (/Edg/.test(ua)) {
    return { isChromium: true, browserName: "Microsoft Edge" };
  }

  // Opera (Chromium-based)
  if (/OPR/.test(ua)) {
    return { isChromium: true, browserName: "Opera" };
  }

  // Brave (Chromium-based)
  // Note: Brave often identifies as Chrome
  if (/Chrome/.test(ua)) {
    // Could be Chrome, Brave, or other Chromium browsers
    return { isChromium: true, browserName: "Chrome" };
  }

  // Unknown browser - assume not compatible
  return { isChromium: false, browserName: "Unknown" };
}

/**
 * Check for OPFS support specifically
 */
async function checkOPFSSupport(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined") return false;
    if (!("storage" in navigator)) return false;
    if (!("getDirectory" in navigator.storage)) return false;

    // Try to get the root directory
    await navigator.storage.getDirectory();
    return true;
  } catch {
    return false;
  }
}

interface BrowserBlockerProps {
  children: React.ReactNode;
}

export function BrowserBlocker({ children }: BrowserBlockerProps) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkCompatibility() {
      const info = detectBrowser();
      setBrowserInfo(info);

      // Even if browser detection says Chromium, verify OPFS support
      const hasOPFS = await checkOPFSSupport();

      if (!info.isChromium || !hasOPFS) {
        setIsBlocked(true);
      }

      setIsChecking(false);
    }

    checkCompatibility();
  }, []);

  // Show nothing while checking
  if (isChecking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show blocker for unsupported browsers
  if (isBlocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Browser Not Supported</CardTitle>
            <CardDescription>
              {browserInfo?.browserName
                ? `${browserInfo.browserName} is not supported.`
                : "Your browser is not supported."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Rubbin Hood requires a Chromium-based browser for secure local
              data storage. Please use one of the following browsers:
            </p>

            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <Chrome className="h-4 w-4" />
                <span>Google Chrome</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Chrome className="h-4 w-4" />
                <span>Microsoft Edge</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Chrome className="h-4 w-4" />
                <span>Brave Browser</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Chrome className="h-4 w-4" />
                <span>Opera</span>
              </li>
            </ul>

            <div className="pt-4">
              <Button asChild className="w-full">
                <a
                  href="https://www.google.com/chrome/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Chrome className="mr-2 h-4 w-4" />
                  Download Chrome
                </a>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Firefox and Safari do not support the Origin Private File System
              (OPFS) required for local data persistence.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Browser is supported, render children
  return <>{children}</>;
}
