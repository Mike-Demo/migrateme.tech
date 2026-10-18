import type { DestinationRenderer } from '../canonical';
import { markdownDest } from './markdown';
import { wxrDest } from './wxr';
import { ghostDest } from './ghost';
import { canonicalJsonDest } from './canonical-json';
import { csvDest } from './csv';
import { ompDest } from './omp';
import { rssAtomDest } from './rss-atom';
import { bloggerAtomDest } from './blogger-atom';
import { shopifyCsvDest } from './shopify-csv';
import { webflowCsvDest } from './webflow-csv';
import { squarespaceWxrDest, wordpressComWxrDest } from './wxr-variants';
import { staticHtmlDest } from './static-html';
import { sanityNdjsonDest } from './sanity-ndjson';
import { contentfulJsonDest } from './contentful-json';

export const destinations: DestinationRenderer[] = [
  markdownDest,
  wxrDest,
  ghostDest,
  canonicalJsonDest,
  csvDest,
  ompDest,
  rssAtomDest,
  bloggerAtomDest,
  shopifyCsvDest,
  webflowCsvDest,
  squarespaceWxrDest,
  wordpressComWxrDest,
  staticHtmlDest,
  sanityNdjsonDest,
  contentfulJsonDest,
];

export function findDestination(id: string): DestinationRenderer | undefined {
  return destinations.find((d) => d.id === id);
}
