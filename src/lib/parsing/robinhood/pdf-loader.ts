/**
 * PDF Loader
 *
 * Loads PDF files and extracts text with position information using pdf.js.
 * Designed for browser-only usage (client-side parsing).
 */

import * as pdfjsLib from "pdfjs-dist";
import type {
  TextItem,
  ExtractedPage,
  ExtractedDocument,
} from "../types";

// Configure pdf.js worker
// In Next.js, we need to set the worker source
// Using unpkg which mirrors npm packages directly (cdnjs may lag behind npm releases)
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

/**
 * PDF loading options
 */
export interface PDFLoadOptions {
  /** Password for encrypted PDFs */
  password?: string;
  /** Maximum pages to extract (default: all) */
  maxPages?: number;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Load a PDF from a File object
 */
export async function loadPDFFromFile(
  file: File,
  options: PDFLoadOptions = {}
): Promise<ExtractedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  return loadPDFFromArrayBuffer(arrayBuffer, options);
}

/**
 * Load a PDF from an ArrayBuffer
 */
export async function loadPDFFromArrayBuffer(
  data: ArrayBuffer,
  options: PDFLoadOptions = {}
): Promise<ExtractedDocument> {
  const { password, maxPages, verbose } = options;

  if (verbose) {
    console.log("[PDF Loader] Loading PDF...");
  }

  // Load the PDF document
  const loadingTask = pdfjsLib.getDocument({
    data,
    password,
  });

  const pdfDocument = await loadingTask.promise;
  const numPages = maxPages
    ? Math.min(pdfDocument.numPages, maxPages)
    : pdfDocument.numPages;

  if (verbose) {
    console.log(`[PDF Loader] Document loaded: ${numPages} pages`);
  }

  // Extract text from all pages
  const pages: ExtractedPage[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const items: TextItem[] = [];

    for (const item of textContent.items) {
      // Skip non-text items
      if (!("str" in item)) continue;

      const textItem = item as {
        str: string;
        transform: number[];
        width: number;
        height: number;
        fontName: string;
      };

      // Skip empty strings
      if (!textItem.str.trim()) continue;

      // Extract position from transform matrix
      // transform = [scaleX, skewY, skewX, scaleY, translateX, translateY]
      const x = textItem.transform[4];
      const y = textItem.transform[5];
      const width = textItem.width;
      const height = textItem.height;

      items.push({
        text: textItem.str,
        x,
        y,
        width,
        height,
        fontName: textItem.fontName,
        pageNumber: pageNum,
      });
    }

    // Sort items by position: top to bottom, left to right
    // PDF coordinates have origin at bottom-left, so higher Y = higher on page
    items.sort((a, b) => {
      // First sort by Y (descending - top to bottom)
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 5) return yDiff; // 5pt tolerance for same line
      // Then by X (ascending - left to right)
      return a.x - b.x;
    });

    pages.push({
      pageNumber: pageNum,
      width: viewport.width,
      height: viewport.height,
      items,
    });

    if (verbose) {
      console.log(
        `[PDF Loader] Page ${pageNum}: ${items.length} text items extracted`
      );
    }
  }

  // Try to extract metadata
  let metadata: ExtractedDocument["metadata"];
  try {
    const info = await pdfDocument.getMetadata();
    // Cast info.info to Record since pdf.js types are incomplete
    const pdfInfo = info.info as Record<string, unknown> | undefined;
    metadata = {
      title: pdfInfo?.Title as string | undefined,
      author: pdfInfo?.Author as string | undefined,
      creationDate: pdfInfo?.CreationDate
        ? parsePDFDate(pdfInfo.CreationDate as string)
        : undefined,
    };
  } catch {
    // Metadata extraction failed, continue without it
  }

  if (verbose) {
    const totalItems = pages.reduce((sum, p) => sum + p.items.length, 0);
    console.log(`[PDF Loader] Extraction complete: ${totalItems} total items`);
  }

  return {
    pageCount: numPages,
    pages,
    metadata,
  };
}

/**
 * Parse a PDF date string (format: D:YYYYMMDDHHmmSS)
 */
function parsePDFDate(dateStr: string): Date | undefined {
  try {
    // Remove "D:" prefix if present
    const cleaned = dateStr.replace(/^D:/, "");
    // Extract components
    const year = parseInt(cleaned.slice(0, 4), 10);
    const month = parseInt(cleaned.slice(4, 6), 10) - 1; // 0-indexed
    const day = parseInt(cleaned.slice(6, 8), 10);
    const hour = parseInt(cleaned.slice(8, 10), 10) || 0;
    const minute = parseInt(cleaned.slice(10, 12), 10) || 0;
    const second = parseInt(cleaned.slice(12, 14), 10) || 0;

    return new Date(year, month, day, hour, minute, second);
  } catch {
    return undefined;
  }
}

/**
 * Flatten all pages into a single array of text items
 */
export function flattenDocument(document: ExtractedDocument): TextItem[] {
  const allItems: TextItem[] = [];
  for (const page of document.pages) {
    allItems.push(...page.items);
  }
  return allItems;
}

/**
 * Get text items for a specific page
 */
export function getPageItems(
  document: ExtractedDocument,
  pageNumber: number
): TextItem[] {
  const page = document.pages.find((p) => p.pageNumber === pageNumber);
  return page?.items ?? [];
}

/**
 * Concatenate all text in document (for debugging/search)
 */
export function getFullText(document: ExtractedDocument): string {
  return flattenDocument(document)
    .map((item) => item.text)
    .join(" ");
}

/**
 * Find text items matching a pattern
 */
export function findTextItems(
  document: ExtractedDocument,
  pattern: RegExp | string
): TextItem[] {
  const regex = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern;
  return flattenDocument(document).filter((item) => regex.test(item.text));
}

/**
 * Get text items within a Y range (useful for extracting rows)
 */
export function getItemsInYRange(
  items: TextItem[],
  minY: number,
  maxY: number
): TextItem[] {
  return items.filter((item) => item.y >= minY && item.y <= maxY);
}

/**
 * Group text items into lines based on Y position, respecting page boundaries.
 * Items on different pages are NEVER grouped into the same line.
 */
export function groupIntoLines(
  items: TextItem[],
  tolerance: number = 5
): TextItem[][] {
  if (items.length === 0) return [];

  // First, group items by page number
  const itemsByPage = new Map<number, TextItem[]>();
  for (const item of items) {
    const pageItems = itemsByPage.get(item.pageNumber) ?? [];
    pageItems.push(item);
    itemsByPage.set(item.pageNumber, pageItems);
  }

  // Process each page's items separately, then combine results
  const allLines: TextItem[][] = [];

  // Sort pages by page number to maintain document order
  const sortedPageNumbers = Array.from(itemsByPage.keys()).sort((a, b) => a - b);

  for (const pageNumber of sortedPageNumbers) {
    const pageItems = itemsByPage.get(pageNumber)!;

    // Sort by Y descending (top to bottom)
    const sorted = [...pageItems].sort((a, b) => b.y - a.y);

    let currentLine: TextItem[] = [sorted[0]];
    let currentY = sorted[0].y;

    for (let i = 1; i < sorted.length; i++) {
      const item = sorted[i];
      if (Math.abs(item.y - currentY) <= tolerance) {
        // Same line (same page is guaranteed by outer loop)
        currentLine.push(item);
      } else {
        // New line - sort current line by X and save
        currentLine.sort((a, b) => a.x - b.x);
        allLines.push(currentLine);
        currentLine = [item];
        currentY = item.y;
      }
    }

    // Don't forget the last line of this page
    if (currentLine.length > 0) {
      currentLine.sort((a, b) => a.x - b.x);
      allLines.push(currentLine);
    }
  }

  return allLines;
}

/**
 * Merge adjacent text items on the same line into words
 */
export function mergeLineText(
  items: TextItem[],
  gapThreshold: number = 10
): string {
  if (items.length === 0) return "";

  // Sort by X position
  const sorted = [...items].sort((a, b) => a.x - b.x);

  let result = sorted[0].text;
  let lastX = sorted[0].x + sorted[0].width;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const gap = item.x - lastX;

    // Add space if there's a gap
    if (gap > gapThreshold) {
      result += " ";
    }

    result += item.text;
    lastX = item.x + item.width;
  }

  return result;
}
