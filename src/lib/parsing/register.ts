/**
 * Importer Registration
 *
 * Import this module to register all platform importers with the global importerRegistry.
 * This is the DI composition root — the upload flow imports this to enable dispatch.
 *
 * Side effects: registers RobinhoodImporter and KalshiImporter with importerRegistry.
 */

// Side-effect imports — these register importers with importerRegistry
import "@/lib/parsing/robinhood/importer";
import "@/lib/parsing/kalshi/importer";
