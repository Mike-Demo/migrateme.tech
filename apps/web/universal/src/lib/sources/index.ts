import type { SourceParser } from '../canonical';
import { wxrSource } from './wxr';
import { markdownSource } from './markdown';
import { ghostSource } from './ghost';
import { jsonSource } from './json';
import { csvSource } from './csv';
import { ompSource } from './omp';
import { rssAtomSource } from './rss-atom';
import { bloggerAtomSource } from './blogger-atom';
import { shopifyCsvSource } from './shopify-csv';
import { webflowCsvSource } from './webflow-csv';
import { notionSource } from './notion';
import { mediumSource } from './medium';
import { scannerSource } from './scanner';
import { sanityNdjsonSource } from './sanity-ndjson';
import { contentfulJsonSource } from './contentful-json';

export const sources: SourceParser[] = [
  wxrSource,
  markdownSource,
  ghostSource,
  jsonSource,
  csvSource,
  ompSource,
  rssAtomSource,
  bloggerAtomSource,
  shopifyCsvSource,
  webflowCsvSource,
  notionSource,
  mediumSource,
  scannerSource,
  sanityNdjsonSource,
  contentfulJsonSource,
];

export function findSource(id: string): SourceParser | undefined {
  return sources.find((s) => s.id === id);
}
