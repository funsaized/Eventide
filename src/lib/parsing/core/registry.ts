/**
 * Importer Registry
 *
 * Platform-agnostic registry for SourceImporter instances.
 * Importers self-register by importing their module (side-effect registration).
 * The upload flow calls findImporter(file) to get the right importer for each file.
 */

import type { Platform } from "@/lib/db/types";

import type { SourceImporter } from "./types";

export class ImporterRegistry {
  private readonly importers: Map<Platform, SourceImporter> = new Map();

  /** Register a platform importer */
  register(importer: SourceImporter): void {
    if (this.importers.has(importer.platform)) {
      console.warn(`[ImporterRegistry] Overwriting existing importer for platform: ${importer.platform}`);
    }

    this.importers.set(importer.platform, importer);
  }

  /**
   * Find the first registered importer that can handle the given file.
   * Iterates in registration order.
   */
  async findImporter(file: File): Promise<SourceImporter | null> {
    for (const importer of this.importers.values()) {
      if (await importer.canHandle(file)) {
        return importer;
      }
    }

    return null;
  }

  /** Get all registered importers */
  getImporters(): SourceImporter[] {
    return Array.from(this.importers.values());
  }

  /** Get importer by platform name */
  getImporter(platform: Platform): SourceImporter | null {
    return this.importers.get(platform) ?? null;
  }
}

/** Global singleton registry */
export const importerRegistry = new ImporterRegistry();
