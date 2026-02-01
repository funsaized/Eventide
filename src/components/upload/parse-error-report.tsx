"use client";

/**
 * ParseErrorReport Component
 *
 * Displays parsing errors with details for troubleshooting.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface ParseErrorReportProps {
  /** Error message */
  error: string;
  /** Additional details */
  details?: string[];
  /** Callback to try again */
  onRetry: () => void;
  /** Custom class name */
  className?: string;
}

export function ParseErrorReport({
  error,
  details,
  onRetry,
  className,
}: ParseErrorReportProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚠️</span>
          <div>
            <CardTitle className="text-destructive">Import Failed</CardTitle>
            <CardDescription>
              There was a problem parsing the statement
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="font-medium text-destructive">{error}</p>
        </div>

        {details && details.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Details:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {details.map((detail, i) => (
                <li key={i}>• {detail}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2 pt-4 border-t">
          <h4 className="text-sm font-medium">Troubleshooting Tips:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Ensure you're uploading a Robinhood Derivatives statement PDF</li>
            <li>• Check that the PDF is not password-protected</li>
            <li>• Make sure the file is not corrupted</li>
            <li>• Try re-downloading the statement from Robinhood</li>
          </ul>
        </div>

        <Button onClick={onRetry} className="w-full">
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}
