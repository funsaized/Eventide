/**
 * Upload Page
 *
 * Statement upload and import flow.
 */

import { UploadFlow } from "@/features/imports/upload-flow";

export const metadata = {
  title: "Upload Statement | Eventide",
  description: "Upload your Robinhood Derivatives statement",
};

export default function UploadPage() {
  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Upload Statement</h1>
        <p className="text-muted-foreground mt-2">
          Import your Robinhood Derivatives monthly statement to track your trades.
        </p>
      </div>

      <UploadFlow />
    </div>
  );
}
