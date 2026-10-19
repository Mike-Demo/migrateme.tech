import type { PairInfo } from './pairs';
import { pairCanonicalUrl } from './pairs';

export interface FaqEntry {
  question: string;
  answer: string;
}

export function buildPairFaq(pair: PairInfo): FaqEntry[] {
  const s = pair.sourceName;
  const d = pair.destName;
  const faq: FaqEntry[] = [];

  if (pair.status === 'planned') {
    faq.push({
      question: `How do I migrate from ${s} to ${d}?`,
      answer:
        `There is no working ${s} to ${d} converter in MigrateMe Universal yet — this pair is marked Planned, ` +
        `which means it is on the roadmap but not built. Pairs marked Supported or Lossy in the conversion matrix work today. ` +
        `This page exists so the roadmap is public and honest rather than implied.`,
    });
  } else {
    faq.push({
      question: `How do I migrate from ${s} to ${d}?`,
      answer:
        `Export your content from ${s} first (if ${s} has no export, the built-in Scanner (lite) can discover content from its sitemap, feeds, and structured data). ` +
        `Then open the converter on this page and add the export — the conversion runs entirely in your browser. ` +
        `Review the field mapping and the dry-run report, which names anything that will be lost before anything is written. ` +
        `Finally, download the ${d} output and import it into ${d}.`,
    });
  }

  if (pair.status === 'supported') {
    faq.push({
      question: `Is migrating from ${s} to ${d} lossless?`,
      answer:
        `Yes — this route is marked Supported, meaning the ${s} export maps onto ${d} through the canonical format without named losses. ` +
        `The dry-run report still shows the full field mapping so you can check it before converting.`,
    });
  } else if (pair.status === 'lossy') {
    const losses = pair.losses.length > 0 ? ` Named losses: ${pair.losses.join(' ')}` : '';
    faq.push({
      question: `Is migrating from ${s} to ${d} lossless?`,
      answer:
        `No — this route is supported but marked Lossy.${losses} ` +
        `Losses are named in the report before you convert, never discovered afterwards.`,
    });
  } else {
    faq.push({
      question: `Is migrating from ${s} to ${d} lossless?`,
      answer:
        `This pair is Planned, so there is no conversion to assess yet. When it ships, this page will state plainly whether it is Supported or Lossy, with any losses named.`,
    });
  }

  if (pair.keeps.length > 0) {
    const fields = pair.keeps.map((k) => k.sourceField).join(', ');
    faq.push({
      question: `What content is kept when migrating from ${s} to ${d}?`,
      answer:
        `The conversion keeps these ${s} fields, mapped through the canonical format to ${d}: ${fields}. ` +
        `The full field-by-field mapping table is on this page.`,
    });
  }

  if (pair.drops.length > 0) {
    const dropped = pair.drops
      .map((x) => (x.reason ? `${x.sourceField} (${x.reason})` : x.sourceField))
      .join('; ');
    faq.push({
      question: `What is dropped when migrating from ${s} to ${d}?`,
      answer: `These fields do not carry over: ${dropped}. Anything not listed here and not listed as a named loss is kept.`,
    });
  } else if (pair.status !== 'planned') {
    faq.push({
      question: `What is dropped when migrating from ${s} to ${d}?`,
      answer:
        `Nothing is dropped outright on this route. If the route is marked Lossy, the losses are transformations named on this page and in the dry-run report, not silent deletions.`,
    });
  }

  faq.push({
    question: `Does the ${s} to ${d} migration upload my files anywhere?`,
    answer:
      `No. MigrateMe Universal converts files locally in your browser — nothing you upload leaves this device. ` +
      `The tool is open source (MIT) and free to use.`,
  });

  return faq;
}

export function pairJsonLd(pair: PairInfo): string {
  const url = pairCanonicalUrl(pair.sourceId, pair.destId);
  const faq = buildPairFaq(pair);
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: faq.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'MigrateMe Universal', item: 'https://universal.migrateme.tech/' },
          { '@type': 'ListItem', position: 2, name: `${pair.sourceName} to ${pair.destName}`, item: url },
        ],
      },
      {
        '@type': 'WebApplication',
        '@id': `${url}#app`,
        name: 'MigrateMe Universal',
        url,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any (web browser)',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: `Migrate content from ${pair.sourceName} to ${pair.destName} in your browser. Route status: ${pair.status}.`,
      },
    ],
  };
  return JSON.stringify(graph);
}
