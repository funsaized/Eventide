/**
 * Kalshi CSV Parsing Utilities
 *
 * Pure utility functions for parsing Kalshi CSV exports.
 * No React dependencies. No side effects.
 */

// ============================================================================
// MONETARY CONVERSION
// ============================================================================

/**
 * Convert cents (integer) to dollars (decimal).
 * This is the SINGLE conversion point — apply once at parse boundary, never downstream.
 *
 * @example centsToDecimal(6500) === 65.00
 * @example centsToDecimal(-996) === -9.96
 */
export function centsToDecimal(cents: number): number {
  return Math.round(cents) / 100;
}

// ============================================================================
// TIMESTAMP PARSING
// ============================================================================

/**
 * Parse an ISO 8601 timestamp to a YYYY-MM-DD date string.
 * Handles both timezone-offset format (Transactions CSV) and UTC format (Activity CSV).
 *
 * @example parseIsoTimestamp("2026-01-24T14:53:59-05:00") === "2026-01-24"
 * @example parseIsoTimestamp("2026-04-06T10:24:46.311Z") === "2026-04-06"
 */
export function parseIsoTimestamp(timestamp: string): string {
  // Extract YYYY-MM-DD from the start of any ISO 8601 string
  const match = timestamp.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) {
    throw new Error(`Invalid ISO 8601 timestamp: ${timestamp}`);
  }
  return match[1];
}

// ============================================================================
// CSV PARSING
// ============================================================================

/**
 * Parse a single CSV line into an array of field values.
 * Handles RFC 4180 quoted fields (fields containing commas or quotes).
 * Does NOT handle newlines within fields (not needed for Kalshi formats).
 *
 * @example parseCsvLine("a,b,c") === ["a", "b", "c"]
 * @example parseCsvLine('"has,comma",b') === ["has,comma", "b"]
 * @example parseCsvLine('"quoted ""value""",b') === ['quoted "value"', "b"]
 * @example parseCsvLine(",,") === ["", "", ""]
 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;

  while (i <= line.length) {
    if (i === line.length) {
      // End of line — push empty field if line ends with comma
      if (line.endsWith(",")) {
        fields.push("");
      }
      break;
    }

    if (line[i] === '"') {
      // Quoted field
      i++; // skip opening quote
      let field = "";
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            // Escaped quote
            field += '"';
            i += 2;
          } else {
            // End of quoted field
            i++; // skip closing quote
            break;
          }
        } else {
          field += line[i];
          i++;
        }
      }
      fields.push(field);
      // Skip comma separator
      if (line[i] === ",") i++;
    } else {
      // Unquoted field — read until comma or end
      const start = i;
      while (i < line.length && line[i] !== ",") {
        i++;
      }
      fields.push(line.slice(start, i));
      if (line[i] === ",") i++; // skip comma
    }
  }

  // Handle empty line
  if (line === "") return [""];

  return fields;
}

// ============================================================================
// BOM HANDLING
// ============================================================================

/**
 * Strip UTF-8 BOM character (\uFEFF) from the start of a string if present.
 * Kalshi Activity CSV files include a BOM prefix.
 *
 * @example stripBom('\uFEFFhello') === 'hello'
 * @example stripBom('hello') === 'hello'
 */
export function stripBom(text: string): string {
  return text.startsWith("\uFEFF") ? text.slice(1) : text;
}

// ============================================================================
// SIDE NORMALIZATION
// ============================================================================

/**
 * Normalize Kalshi CSV side value ("yes"/"no") to DB enum ("YES"/"NO").
 *
 * @throws Error if side is not "yes" or "no"
 */
export function normalizeSide(side: string): "YES" | "NO" {
  const lower = side.toLowerCase().trim();
  if (lower === "yes") return "YES";
  if (lower === "no") return "NO";
  throw new Error(`Invalid Kalshi side value: "${side}". Expected "yes" or "no".`);
}
