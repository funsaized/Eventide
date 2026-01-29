/**
 * Parser Registry
 *
 * Manages statement parser versions and provides automatic parser selection
 * based on document version detection.
 */

import type {
  ExtractedDocument,
  StatementParser,
  ParsedStatement,
  ValidationResult,
} from "./types";
import {
  detectVersion,
  getSupportedVersions,
  isRobinhoodDerivativesStatement,
  type StatementVersion,
  type VersionDetectionResult,
} from "./version-detector";

/**
 * Parser registration entry
 */
interface ParserRegistration {
  /** Parser instance */
  parser: StatementParser;
  /** Priority (higher = preferred) */
  priority: number;
  /** Whether this parser is enabled */
  enabled: boolean;
}

/**
 * Parse result with metadata
 */
export interface ParseResult {
  /** Parsed statement data */
  statement: ParsedStatement;
  /** Version detection result */
  versionInfo: VersionDetectionResult;
  /** Parser that was used */
  parserVersion: string;
  /** Parse duration in milliseconds */
  parseTimeMs: number;
}

/**
 * Parser registry error types
 */
export class ParserRegistryError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NO_PARSER_AVAILABLE"
      | "PARSER_NOT_FOUND"
      | "PARSE_FAILED"
      | "VALIDATION_FAILED"
      | "NOT_ROBINHOOD_STATEMENT"
  ) {
    super(message);
    this.name = "ParserRegistryError";
  }
}

/**
 * Parser Registry
 *
 * Central registry for managing statement parsers. Supports:
 * - Automatic parser selection based on version detection
 * - Manual parser override
 * - Parser priority ordering
 * - Parse validation
 */
export class ParserRegistry {
  private parsers: Map<string, ParserRegistration> = new Map();
  private versionParserMap: Map<StatementVersion, string[]> = new Map();

  /**
   * Register a parser
   */
  register(parser: StatementParser, priority: number = 0): void {
    const version = parser.version;

    if (this.parsers.has(version)) {
      console.warn(`[ParserRegistry] Overwriting existing parser: ${version}`);
    }

    this.parsers.set(version, {
      parser,
      priority,
      enabled: true,
    });

    // Build version-to-parser mapping
    this.rebuildVersionMap();

    console.log(`[ParserRegistry] Registered parser: ${version} (priority: ${priority})`);
  }

  /**
   * Unregister a parser
   */
  unregister(version: string): boolean {
    const removed = this.parsers.delete(version);
    if (removed) {
      this.rebuildVersionMap();
      console.log(`[ParserRegistry] Unregistered parser: ${version}`);
    }
    return removed;
  }

  /**
   * Enable or disable a parser
   */
  setEnabled(version: string, enabled: boolean): void {
    const registration = this.parsers.get(version);
    if (registration) {
      registration.enabled = enabled;
      this.rebuildVersionMap();
    }
  }

  /**
   * Get a specific parser by version
   */
  getParser(version: string): StatementParser | null {
    const registration = this.parsers.get(version);
    return registration?.enabled ? registration.parser : null;
  }

  /**
   * Get all registered parsers
   */
  getAllParsers(): StatementParser[] {
    return Array.from(this.parsers.values())
      .filter((r) => r.enabled)
      .sort((a, b) => b.priority - a.priority)
      .map((r) => r.parser);
  }

  /**
   * Get parsers compatible with a document
   */
  getCompatibleParsers(document: ExtractedDocument): StatementParser[] {
    return this.getAllParsers().filter((parser) => parser.canParse(document));
  }

  /**
   * Find the best parser for a document
   */
  findBestParser(document: ExtractedDocument): {
    parser: StatementParser;
    versionInfo: VersionDetectionResult;
  } | null {
    // First, detect the document version
    const versionInfo = detectVersion(document);

    // Get parsers compatible with detected version
    const versionParsers = this.versionParserMap.get(versionInfo.version) ?? [];

    // Sort by priority and find one that can parse
    const sortedParsers = versionParsers
      .map((v) => this.parsers.get(v))
      .filter((r): r is ParserRegistration => r !== undefined && r.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const registration of sortedParsers) {
      if (registration.parser.canParse(document)) {
        return { parser: registration.parser, versionInfo };
      }
    }

    // Fallback: try any compatible parser
    const compatible = this.getCompatibleParsers(document);
    if (compatible.length > 0) {
      return { parser: compatible[0], versionInfo };
    }

    return null;
  }

  /**
   * Parse a document using automatic parser selection
   */
  async parse(document: ExtractedDocument): Promise<ParseResult> {
    const startTime = performance.now();

    // Check if this is a Robinhood statement
    if (!isRobinhoodDerivativesStatement(document)) {
      throw new ParserRegistryError(
        "Document does not appear to be a Robinhood Derivatives statement",
        "NOT_ROBINHOOD_STATEMENT"
      );
    }

    // Find the best parser
    const best = this.findBestParser(document);
    if (!best) {
      throw new ParserRegistryError(
        "No compatible parser found for this document",
        "NO_PARSER_AVAILABLE"
      );
    }

    const { parser, versionInfo } = best;

    try {
      // Parse the document
      const statement = await parser.parse(document);
      const parseTimeMs = performance.now() - startTime;

      return {
        statement,
        versionInfo,
        parserVersion: parser.version,
        parseTimeMs,
      };
    } catch (error) {
      throw new ParserRegistryError(
        `Parse failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "PARSE_FAILED"
      );
    }
  }

  /**
   * Parse a document with a specific parser version
   */
  async parseWithVersion(
    document: ExtractedDocument,
    parserVersion: string
  ): Promise<ParseResult> {
    const startTime = performance.now();

    const parser = this.getParser(parserVersion);
    if (!parser) {
      throw new ParserRegistryError(
        `Parser not found: ${parserVersion}`,
        "PARSER_NOT_FOUND"
      );
    }

    const versionInfo = detectVersion(document);

    try {
      const statement = await parser.parse(document);
      const parseTimeMs = performance.now() - startTime;

      return {
        statement,
        versionInfo,
        parserVersion: parser.version,
        parseTimeMs,
      };
    } catch (error) {
      throw new ParserRegistryError(
        `Parse failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "PARSE_FAILED"
      );
    }
  }

  /**
   * Parse and validate a document
   */
  async parseAndValidate(document: ExtractedDocument): Promise<{
    result: ParseResult;
    validation: ValidationResult;
  }> {
    const result = await this.parse(document);
    const parser = this.getParser(result.parserVersion);

    if (!parser) {
      throw new ParserRegistryError(
        `Parser not found for validation: ${result.parserVersion}`,
        "PARSER_NOT_FOUND"
      );
    }

    const validation = parser.validate(result.statement);

    if (!validation.success && validation.errors.length > 0) {
      // Add validation warnings to the result
      result.statement.warnings.push(
        ...validation.errors.map((e) => `Validation error: ${e}`)
      );
    }

    return { result, validation };
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalParsers: number;
    enabledParsers: number;
    supportedVersions: StatementVersion[];
  } {
    const allParsers = Array.from(this.parsers.values());
    return {
      totalParsers: allParsers.length,
      enabledParsers: allParsers.filter((r) => r.enabled).length,
      supportedVersions: getSupportedVersions(),
    };
  }

  /**
   * Rebuild the version-to-parser mapping
   */
  private rebuildVersionMap(): void {
    this.versionParserMap.clear();

    for (const [version, registration] of this.parsers) {
      if (!registration.enabled) continue;

      const parser = registration.parser;

      // Map parser to all versions within its effective date range
      for (const statementVersion of getSupportedVersions()) {
        // For now, just map each parser to the closest version
        // In the future, this could use effectiveFrom/effectiveTo dates
        if (!this.versionParserMap.has(statementVersion)) {
          this.versionParserMap.set(statementVersion, []);
        }
        this.versionParserMap.get(statementVersion)!.push(version);
      }
    }
  }
}

/**
 * Global parser registry instance
 */
export const parserRegistry = new ParserRegistry();

/**
 * Convenience function to parse a document using the global registry
 */
export async function parseStatement(document: ExtractedDocument): Promise<ParseResult> {
  return parserRegistry.parse(document);
}

/**
 * Convenience function to parse and validate using the global registry
 */
export async function parseAndValidateStatement(document: ExtractedDocument): Promise<{
  result: ParseResult;
  validation: ValidationResult;
}> {
  return parserRegistry.parseAndValidate(document);
}

/**
 * Register a parser with the global registry
 */
export function registerParser(parser: StatementParser, priority?: number): void {
  parserRegistry.register(parser, priority);
}
