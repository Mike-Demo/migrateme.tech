# WordPress WXR source connector

`@migrateme/connector-wordpress` reads WordPress eXtended RSS (WXR) exports and produces the shared `ContentItem` model.

```ts
import { WordPressConnector } from "@migrateme/connector-wordpress";

const wordpress = new WordPressConnector();

if (await wordpress.detect("./wordpress-export.xml")) {
  console.log(await wordpress.inspect("./wordpress-export.xml"));

  for await (const item of wordpress.extract("./wordpress-export.xml")) {
    console.log(item.type, item.title);
  }
}
```

`extract()` parses the file incrementally with a SAX XML parser. It does not load a complete export into memory or make network requests; URLs in WXR are preserved as metadata only.

Supported data includes posts, pages, attachments, category and tag assignments, post metadata/custom fields, CDATA-encoded content, and attachment URLs. The inventory reports counts for posts, pages, attachments, other post types, declared categories, and declared tags.

Featured-image metadata is stored in `customFields._thumbnail_id`. When the referenced attachment has already appeared in the export, `featuredImage` contains its attachment URL; otherwise it retains an `attachment:<id>` reference. Attachment items also store their WXR URL in `featuredImage`.

The connector is source-only: it supports `stream-extract`. Authentication is a no-op for local files. Mapping is identity; load, verify, checkpoint, resume, and rollback are unsupported and report `UnsupportedCapabilityError`.
