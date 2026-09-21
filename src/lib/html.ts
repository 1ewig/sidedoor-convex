/**
 * Pure HTML & Markdown text sanitization utilities. No dependencies, no I/O.
 */

/**
 * Decodes all named, decimal, and hexadecimal HTML entities.
 */
export function cleanHtmlText(str?: string): string {
  if (!str) return '';
  return str
    // Standard named entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&hellip;/g, '…')
    .replace(/&bull;/g, '•')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&cent;/g, '¢')
    .replace(/&pound;/g, '£')
    .replace(/&yen;/g, '¥')
    .replace(/&euro;/g, '€')
    // Decimal entities: e.g. &#038; -> &, &#8217; -> '
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return !isNaN(code) && code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : '';
    })
    // Hexadecimal entities: e.g. &#x26; -> &
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return !isNaN(code) && code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : '';
    })
    // Strip raw HTML tags: e.g. <br>, <br/>, <p>, <span>, <div>, etc.
    .replace(/<[^>]+>/g, ' ')
    .trim();
}

/**
 * Strips markdown syntax, unwraps links, removes asterisks/underscores, and cleans label prefixes.
 */
export function stripMarkdown(str?: string): string {
  if (!str) return '';
  return str
    // Convert full markdown links: [Anchor Text](http://url) -> Anchor Text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove broken or dangling markdown link fragments: ](http://url) or [text
    .replace(/\]\([^)]*\)?/g, '')
    .replace(/[[\]]/g, '')
    // Strip bold and italics formatting: **text** -> text, __text__ -> text, *text* -> text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    .replace(/[*_~`\\]/g, '')
    // Strip markdown header hashes anywhere in text: ### Title -> Title
    .replace(/#+\s*/g, '')
    // Strip common metadata label prefixes often scraped with text: e.g. "Location: Venue Name" -> "Venue Name"
    .replace(/^(?:location|venue|where|at|place):\s*/i, '')
    // Strip leading list numbers: e.g. "1. " or "5 "
    .replace(/^[0-9]+[.)\s-]+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Combined high-order cleaner: decodes all HTML entities and strips all markdown syntax.
 */
export function cleanText(str?: string): string {
  if (!str) return '';
  return stripMarkdown(cleanHtmlText(str));
}