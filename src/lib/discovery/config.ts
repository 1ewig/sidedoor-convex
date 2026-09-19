/**
 * Shared configuration for the discovery pipeline.
 */

export const SIDEDOOR_MODEL = 'gemini-3.5-flash-lite';

/** Upper bound on candidates fed into the semantic curator per scout run. */
export const MAX_PIPELINE_CANDIDATES = 8;

/** Per-page markdown character budget sent to the deep-lane extractor. */
export const MARKDOWN_EXCERPT_LIMIT = 15000;

/**
 * Resolves the Google Gemini API key from any of the supported env variable names.
 */
export function getGoogleApiKey(): string | undefined {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY
  );
}