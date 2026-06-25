/**
 * SalesCode archetype profiles, keyed by 4-letter type code.
 *
 * Empty by design — populated in Phase 2 from the canonical 16-archetype
 * document. Until then, the result page falls back to a "profile not yet
 * available" state for any code without an entry.
 */
import type { SalesCodeType, TypeProfile } from "./types";

export const TYPE_PROFILES: Record<SalesCodeType, TypeProfile> = {};
