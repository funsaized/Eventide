import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/lib/state/query-provider";
import { BrowserBlocker } from "@/components/browser";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rubbin Hood - Prediction Market Analytics",
  description:
    "Local-first analytics platform for tracking prediction market trading activity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <BrowserBlocker>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </BrowserBlocker>
      </body>
    </html>
  );
}
