export interface DemoDataset {
  sourceId: string;
  fileName: string;
  text?: string;
  files?: Record<string, string>;
  description: string;
}

const WXR_DEMO = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
  <title>Demo WordPress Blog</title>
  <link>https://demo.example</link>
  <item>
    <title>Hello World</title>
    <dc:creator>Jane Writer</dc:creator>
    <content:encoded><![CDATA[<p>Welcome to the demo <strong>WordPress</strong> blog.</p><img src="https://demo.example/img/hello.jpg" alt="Hello banner"><p>Second paragraph.</p>]]></content:encoded>
    <excerpt:encoded><![CDATA[<p>The first demo post.</p>]]></excerpt:encoded>
    <wp:post_id>101</wp:post_id>
    <wp:post_date>2024-03-01 09:00:00</wp:post_date>
    <wp:post_name>hello-world</wp:post_name>
    <wp:status>publish</wp:status>
    <wp:post_type>post</wp:post_type>
    <category domain="category" nicename="news"><![CDATA[News]]></category>
    <category domain="post_tag" nicename="intro"><![CDATA[intro]]></category>
    <wp:postmeta><wp:meta_key>_thumbnail_id</wp:meta_key><wp:meta_value>103</wp:meta_value></wp:postmeta>
    <wp:postmeta><wp:meta_key>reading_time</wp:meta_key><wp:meta_value>3 min</wp:meta_value></wp:postmeta>
  </item>
  <item>
    <title>About the Demo</title>
    <dc:creator>Jane Writer</dc:creator>
    <content:encoded><![CDATA[<p>This is a demo page.</p><img src="https://demo.example/img/team.jpg">]]></content:encoded>
    <wp:post_id>102</wp:post_id>
    <wp:post_date>2024-02-20 14:30:00</wp:post_date>
    <wp:post_name>about</wp:post_name>
    <wp:status>draft</wp:status>
    <wp:post_type>page</wp:post_type>
  </item>
  <item>
    <title>hello.jpg</title>
    <dc:creator>Jane Writer</dc:creator>
    <wp:post_id>103</wp:post_id>
    <wp:post_date>2024-03-01 08:55:00</wp:post_date>
    <wp:post_name>hello-jpg</wp:post_name>
    <wp:status>inherit</wp:status>
    <wp:post_type>attachment</wp:post_type>
    <wp:attachment_url>https://demo.example/img/hello.jpg</wp:attachment_url>
  </item>
</channel>
</rss>`;

const GHOST_DEMO = JSON.stringify(
  {
    meta: { exported_on: 1700000000000, version: '5.0.0' },
    data: {
      posts: [
        {
          id: 'g-1',
          uuid: 'b1d3d1a0-demo-4a01-9d29-ghostdemo001',
          title: 'Designing with Ghost',
          slug: 'designing-with-ghost',
          html: '<p>Ghost makes <em>publishing</em> simple.</p><img src="https://demo.example/img/ghost.jpg" alt="Ghost editor">',
          markdown: '',
          custom_excerpt: 'A demo Ghost post.',
          published_at: '2024-05-10T10:00:00.000Z',
          status: 'published',
          feature_image: 'https://demo.example/img/ghost.jpg',
          authors: [{ name: 'Sam Demo' }],
          tags: [{ name: '#product' }, { name: 'publishing' }],
        },
        {
          id: 'g-2',
          uuid: 'b1d3d1a0-demo-4a01-9d29-ghostdemo002',
          title: 'Draft: Newsletter ideas',
          slug: 'draft-newsletter-ideas',
          html: '<p>Ideas for the newsletter.</p>',
          markdown: '',
          published_at: null,
          status: 'draft',
          feature_image: null,
          authors: [{ name: 'Sam Demo' }],
          tags: [],
        },
      ],
      tags: [],
    },
  },
  null,
  2,
);

const MARKDOWN_DEMO_FILES: Record<string, string> = {
  'posts/2024-04-01-markdown-migrations.md': `---
title: Markdown Migrations
slug: markdown-migrations
date: 2024-04-01
categories:
  - Tutorials
tags:
  - markdown
  - migration
author: Pat Demo
excerpt: How to move a Markdown site.
---

# Markdown Migrations

Moving a Markdown site is straightforward.

![Folder structure](https://demo.example/img/folders.jpg)

Second paragraph with **bold** text.
`,
  'posts/2024-04-15-frontmatter-tips.md': `---
title: Frontmatter Tips
date: 2024-04-15
tags:
  - frontmatter
draft: true
---

A short post about frontmatter fields.
`,
  'pages/about.md': `---
title: About
---

All about this demo Markdown site.
`,
};

const CSV_DEMO = `id,title,slug,date,body,excerpt,categories,tags,author,status
1,Pricing page redesign,pricing-redesign,2024-06-01,"<p>We rebuilt the pricing page.</p>",New pricing live,Product,design; pricing,Avery Demo,published
2,Q2 content roadmap,q2-roadmap,2024-06-10,"<p>The plan for Q2.</p>",What is coming,Q2,planning,Avery Demo,draft
`;

/* ---------- easy in/out batch demos ---------- */

const RSS_DEMO = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>Demo Blog Feed</title>
  <link>https://demo.example</link>
  <description>Two recent demo entries</description>
  <item>
    <title>RSS round trip</title>
    <link>https://demo.example/rss-round-trip</link>
    <guid isPermaLink="false">demo-rss-1</guid>
    <pubDate>Mon, 04 Mar 2024 10:00:00 GMT</pubDate>
    <dc:creator>Robin Demo</dc:creator>
    <description>&lt;p&gt;A short summary of the entry.&lt;/p&gt;</description>
    <content:encoded><![CDATA[<p>Full <strong>content</strong> for the feed entry.</p><img src="https://demo.example/img/feed.jpg" alt="Feed illustration"><p>Second paragraph.</p>]]></content:encoded>
    <category>Feeds</category>
    <category>Demo</category>
  </item>
  <item>
    <title>Second entry</title>
    <link>https://demo.example/second-entry</link>
    <guid isPermaLink="false">demo-rss-2</guid>
    <pubDate>Tue, 05 Mar 2024 09:30:00 GMT</pubDate>
    <description>Plain summary, no content:encoded block.</description>
    <category>Demo</category>
  </item>
</channel>
</rss>`;

const BLOGGER_DEMO = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:gd="http://schemas.google.com/g/2005" xmlns:blogger="http://www.blogger.com/feeds/2008">
  <title>Demo Blogger Blog</title>
  <id>tag:blogger.com,1999:blog-demo123</id>
  <updated>2024-04-01T12:00:00Z</updated>
  <entry>
    <id>tag:blogger.com,1999:blog-demo123.post-1</id>
    <published>2024-03-15T08:00:00Z</published>
    <updated>2024-03-15T08:05:00Z</updated>
    <title>Blogger to anywhere</title>
    <content type="html">&lt;p&gt;Moving from &lt;strong&gt;Blogger&lt;/strong&gt; with labels and images.&lt;/p&gt;&lt;img src="https://demo.example/img/blogger.jpg" alt="Blogger demo"&gt;</content>
    <link rel="alternate" type="text/html" href="https://demo-blogger.example/2024/03/blogger-to-anywhere.html"/>
    <link rel="image" href="https://demo.example/img/blogger.jpg"/>
    <category scheme="http://www.blogger.com/feeds/2008#kind" term="post"/>
    <category term="Migration"/>
    <category term="Blogger"/>
    <author><name>Avery Demo</name></author>
  </entry>
  <entry>
    <id>tag:blogger.com,1999:blog-demo123.post-2</id>
    <published>2024-03-20T09:00:00Z</published>
    <updated>2024-03-20T09:00:00Z</updated>
    <title>Draft post</title>
    <content type="html">&lt;p&gt;A draft entry.&lt;/p&gt;</content>
    <category scheme="http://www.blogger.com/feeds/2008#kind" term="post"/>
    <category term="Demo"/>
    <blogger:status>draft</blogger:status>
    <author><name>Avery Demo</name></author>
  </entry>
  <entry>
    <id>tag:blogger.com,1999:blog-demo123.comment-1</id>
    <published>2024-03-16T10:00:00Z</published>
    <updated>2024-03-16T10:00:00Z</updated>
    <title>Re: Blogger to anywhere</title>
    <content type="html">Nice post!</content>
    <category scheme="http://www.blogger.com/feeds/2008#kind" term="comment"/>
    <author><name>Reader</name></author>
  </entry>
</feed>`;

const SHOPIFY_DEMO = `Handle,Title,Body (HTML),Vendor,Product Category,Type,Tags,Published,Published At,Created At,Variant SKU,Image Src,Status
demo-handle-1,Demo product one,"<p>A demo product body.</p>",Demo Vendor,Apparel,Apparel,"sale; demo",true,2024-05-01 10:00:00 +0000,2024-04-30 10:00:00 +0000,SKU-1,https://demo.example/img/shopify.jpg,active
,,,,,,,false,,,,,,,,SK UD-1B,
demo-handle-2,Second demo product,"<p>Another body.</p>",Demo Vendor,Home,Home,,true,2024-05-10 11:00:00 +0000,2024-05-09 11:00:00 +0000,SKU-2,,active
`;

const WEBFLOW_DEMO = `Slug,Name,Post Body,Post Summary,Published On,Created On,Updated On,Main Image,Author,Category,Tags,Draft
webflow-demo-post,Demo Webflow post,"<p>A demo <strong>Webflow</strong> post.</p>",Short summary,2024-06-01T10:00:00Z,2024-06-01T10:00:00Z,2024-06-02T10:00:00Z,https://demo.example/img/webflow.jpg,Avery Demo,Design,"cms; demo",false
second-demo-post,Second demo post,"<p>Draft body.</p>",,2024-06-11T09:00:00Z,2024-06-11T09:00:00Z,,,Avery Demo,Design,,true
`;

const NOTION_DEMO_FILES: Record<string, string> = {
  'Notion Export/Demo Page c7d4e6a5f0d24c3f8b21a9e0d3b7c111.md': `# Demo Page

A demo Notion page with a callout and a list.

- First bullet
- Second bullet

![Demo image](https://demo.example/img/notion.jpg)
`,
  'Notion Export/Second Page 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d.md': `# Second Page

Another demo page.
`,
  'Notion Export/Demo database 9f8e7d6c5b4a3210fedcba9876543210.csv': `Name,Status\nRow one,Done\n`,
};

const MEDIUM_DEMO_FILES: Record<string, string> = {
  'posts/medium-demo-post/index.html': `<article><h1>Medium demo post</h1><h2>A demo subtitle</h2><p>Hello from a <strong>Medium</strong> demo export.</p><figure><img src="https://demo.example/img/medium.jpg" alt="Medium demo"></figure><h3>Subheading</h3><p>More body text.</p><a href="https://medium.com/tag/migration">#migration</a></article>`,
  'posts/second-medium-post/index.html': `<article><h1>Second demo post</h1><p>No subtitle here.</p><a href="https://medium.com/tag/writing">#writing</a></article>`,
  'profile.html': '<html><body>Profile page, not a post.</body></html>',
};

export const DEMO_DATASETS: DemoDataset[] = [
  {
    sourceId: 'wxr',
    fileName: 'demo-wordpress-export.xml',
    text: WXR_DEMO,
    description: 'A small WordPress blog: 2 posts/pages and 1 attachment with postmeta',
  },
  {
    sourceId: 'ghost',
    fileName: 'demo-ghost-export.json',
    text: GHOST_DEMO,
    description: 'A Ghost export with 2 posts, internal tags and a draft',
  },
  {
    sourceId: 'markdown',
    fileName: 'demo-markdown-folder.zip',
    files: MARKDOWN_DEMO_FILES,
    description: 'A Markdown folder: 2 posts and 1 page with frontmatter',
  },
  {
    sourceId: 'csv',
    fileName: 'demo-content.csv',
    text: CSV_DEMO,
    description: 'A CSV sheet with 2 content rows',
  },
  {
    sourceId: 'json',
    fileName: 'demo-generic.json',
    text: JSON.stringify(
      [
        {
          id: 1,
          title: 'First generic record',
          slug: 'first-generic-record',
          date: '2024-07-01T12:00:00Z',
          content: '<p>Generic JSON record one.</p>',
          author: 'Robin Demo',
          tags: ['json'],
          status: 'published',
        },
        {
          id: 2,
          title: 'Second generic record',
          slug: 'second-generic-record',
          date: '2024-07-02T12:00:00Z',
          content: 'Plain markdown body for record two.',
          author: 'Robin Demo',
          status: 'draft',
        },
      ],
      null,
      2,
    ),
    description: 'A generic JSON array with 2 records',
  },
  {
    sourceId: 'rss-atom',
    fileName: 'demo-feed.xml',
    text: RSS_DEMO,
    description: 'An RSS 2.0 feed with 2 recent entries (summary + full content)',
  },
  {
    sourceId: 'blogger-atom',
    fileName: 'demo-blogger-export.xml',
    text: BLOGGER_DEMO,
    description: 'A Blogger Atom export: 1 published post, 1 draft and 1 skipped comment',
  },
  {
    sourceId: 'shopify-csv',
    fileName: 'demo-shopify-products.csv',
    text: SHOPIFY_DEMO,
    description: 'A Shopify product CSV: 2 products, 1 variant row',
  },
  {
    sourceId: 'webflow-csv',
    fileName: 'demo-webflow-collection.csv',
    text: WEBFLOW_DEMO,
    description: 'A Webflow CMS Collection CSV: 2 collection items, 1 draft',
  },
  {
    sourceId: 'notion',
    fileName: 'demo-notion-export.zip',
    files: NOTION_DEMO_FILES,
    description: 'A Notion Markdown export: 2 pages and 1 database CSV (CSV not imported)',
  },
  {
    sourceId: 'medium',
    fileName: 'demo-medium-export.zip',
    files: MEDIUM_DEMO_FILES,
    description: 'A Medium export ZIP: 2 HTML posts plus a skipped profile page',
  },
];

export function demoForSource(sourceId: string): DemoDataset | undefined {
  return DEMO_DATASETS.find((d) => d.sourceId === sourceId);
}
