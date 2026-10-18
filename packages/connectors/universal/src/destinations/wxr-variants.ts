import type { DestinationRenderer, RenderOutput } from '../canonical';
import { buildManifest } from '../convert';
import { renderWxr } from './wxr';

function wxrVariant(
  id: string,
  label: string,
  fileName: string,
): DestinationRenderer {
  return {
    id,
    label,
    extension: '.xml',
    destFields: {
      title: 'title',
      slug: 'wp:post_name',
      date: 'wp:post_date',
      body: 'content:encoded',
      excerpt: 'excerpt:encoded',
      categories: 'category (domain=category)',
      tags: 'category (domain=post_tag)',
      author: 'dc:creator',
      status: 'wp:status',
      customFields: 'wp:postmeta (ignored by the platform importer)',
      featuredImage: 'wp:attachment_url on attachments',
    },
    render(items): RenderOutput {
      const content = renderWxr(items);
      const manifest = buildManifest(items, id, () => fileName);
      return { files: [{ path: fileName, content }], manifest };
    },
  };
}

export const squarespaceWxrDest = wxrVariant(
  'squarespace-wxr',
  'Squarespace WXR-compatible export (.xml)',
  'squarespace-export.xml',
);

export const wordpressComWxrDest = wxrVariant(
  'wordpress-com-wxr',
  'WordPress.com WXR export (.xml)',
  'wordpress-com-export.xml',
);
