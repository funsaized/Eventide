/**
 * Shared table utilities.
 */

export function getStickyColumnClassName(index: number): string {
  return index === 0 ? "sticky left-0 z-10 bg-background md:static" : "";
}
