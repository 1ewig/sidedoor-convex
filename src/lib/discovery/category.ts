import { EventCategory } from '@/types';

interface InferCategoryInput {
  text?: string;
  schemaType?: string | string[];
}

/**
 * Unified pure category classifier for both Schema.org JSON-LD and raw text/markdown.
 * Eliminates category drift across Lane A and Lane B.
 */
export function inferEventCategory({ text = '', schemaType = '' }: InferCategoryInput): EventCategory {
  const typeStr = Array.isArray(schemaType) ? schemaType.join(' ') : String(schemaType || '');
  const combined = `${typeStr} ${text}`.toLowerCase();

  if (/exhibition|visualarts|gallery|vernissage|paint|sculpture|photo|museum|art/i.test(combined)) {
    return 'art';
  }
  if (/market|flea|vintage|craft|makers|bazaar|saleevent|fair/i.test(combined)) {
    return 'market';
  }
  if (/food|dinner|tasting|chef|bakery|brunch|supper|culinary|brewery|sake|wine/i.test(combined)) {
    return 'food';
  }
  if (/dance|club|rave|techno|dj|nightlife|disco|party/i.test(combined)) {
    return 'nightlife';
  }
  if (/community|meetup|volunteer|garden|talk|reading|literary|book|social/i.test(combined)) {
    return 'community';
  }

  return 'music';
}
