/**
 * Vitest Setup File
 *
 * Handles environment setup and mocks for testing.
 */

import { vi } from "vitest";
import type { TextItem, ExtractedDocument } from "@/lib/parsing/robinhood/types";

// Mock pdfjs-dist to avoid Node.js environment issues
vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: "" },
  version: "4.0.0",
}));

// Provide actual implementations for the utility functions
// These don't need pdfjs-dist
vi.mock("@/lib/parsing/robinhood/pdf-loader", async () => {
  const actual = await vi.importActual<typeof import("@/lib/parsing/robinhood/pdf-loader")>("@/lib/parsing/robinhood/pdf-loader");

  return {
    ...actual,
    // Override functions that use pdfjs-dist
    loadPDFFromFile: vi.fn(),
    loadPDFFromArrayBuffer: vi.fn(),
    // Keep the utility functions that don't need pdfjs-dist
    flattenDocument: (document: ExtractedDocument): TextItem[] => {
      return document.pages.flatMap(page => page.items);
    },
    getPageItems: (document: ExtractedDocument, pageNum: number): TextItem[] => {
      const page = document.pages.find(p => p.pageNumber === pageNum);
      return page?.items ?? [];
    },
    getFullText: (document: ExtractedDocument): string => {
      const items = document.pages.flatMap(page => page.items);
      return items.map(item => item.text).join(" ");
    },
    findTextItems: (document: ExtractedDocument, pattern: RegExp | string): TextItem[] => {
      const regex = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern;
      const items = document.pages.flatMap(page => page.items);
      return items.filter(item => regex.test(item.text));
    },
    getItemsInYRange: (items: TextItem[], minY: number, maxY: number): TextItem[] => {
      return items.filter(item => item.y >= minY && item.y <= maxY);
    },
    groupIntoLines: (items: TextItem[], tolerance: number = 5): TextItem[][] => {
      if (items.length === 0) return [];

      const sorted = [...items].sort((a, b) => b.y - a.y);

      const lines: TextItem[][] = [];
      let currentLine: TextItem[] = [sorted[0]];
      let currentY = sorted[0].y;

      for (let i = 1; i < sorted.length; i++) {
        const item = sorted[i];
        if (Math.abs(item.y - currentY) <= tolerance) {
          currentLine.push(item);
        } else {
          currentLine.sort((a, b) => a.x - b.x);
          lines.push(currentLine);
          currentLine = [item];
          currentY = item.y;
        }
      }

      if (currentLine.length > 0) {
        currentLine.sort((a, b) => a.x - b.x);
        lines.push(currentLine);
      }

      return lines;
    },
    mergeLineText: (items: TextItem[], gapThreshold: number = 10): string => {
      if (items.length === 0) return "";

      const sorted = [...items].sort((a, b) => a.x - b.x);

      let result = sorted[0].text;
      let lastX = sorted[0].x + sorted[0].width;

      for (let i = 1; i < sorted.length; i++) {
        const item = sorted[i];
        const gap = item.x - lastX;

        if (gap > gapThreshold) {
          result += " ";
        }

        result += item.text;
        lastX = item.x + item.width;
      }

      return result;
    },
  };
});
