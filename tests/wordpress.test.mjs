import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  WordPressConnector,
  UnsupportedCapabilityError
} from "../packages/connectors/wordpress/dist/index.js";

const fixture = fileURLToPath(new URL("./fixtures/wordpress-wxr.xml", import.meta.url));
const malformedFixture = fileURLToPath(new URL("./fixtures/wordpress-wxr-malformed.xml", import.meta.url));
const connector = new WordPressConnector();

async function collect(items) {
  const result = [];
  for await (const item of items) result.push(item);
  return result;
}

test("detect identifies a WXR fixture and rejects malformed or non-WXR XML", async () => {
  assert.equal(await connector.detect(fixture), true);
  assert.equal(await connector.detect(malformedFixture), false);
  assert.equal(await connector.detect(new URL("../package.json", import.meta.url).pathname), false);
});

test("inspect returns deterministic counts by WXR item and taxonomy type", async () => {
  const expected = {
    counts: {
      posts: 1,
      pages: 1,
      attachments: 1,
      other: 0,
      categories: 1,
      tags: 1
    }
  };
  assert.deepEqual(await connector.inspect(fixture), expected);
  assert.deepEqual(await connector.inspect(fixture), expected);
});

test("extract streams valid ContentItems with CDATA, custom fields, and featured image URLs", async () => {
  const iterator = connector.extract(fixture)[Symbol.asyncIterator]();
  const first = await iterator.next();
  assert.equal(first.done, false);
  assert.equal(first.value.type, "attachment");
  assert.equal(first.value.featuredImage, "https://example.test/uploads/hero.jpg");

  const items = [first.value, ...(await collect({ [Symbol.asyncIterator]: () => iterator }))];
  assert.deepEqual(items.map((item) => item.type), ["attachment", "post", "page"]);
  assert.equal(items[1].body, "<p>CDATA <strong>content</strong>.</p>");
  assert.equal(items[1].customFields.subtitle, "Keep this custom field");
  assert.equal(items[1].customFields._thumbnail_id, "10");
  assert.equal(items[1].featuredImage, "https://example.test/uploads/hero.jpg");
  assert.deepEqual(items[1].categories, ["News"]);
  assert.deepEqual(items[1].tags, ["Migration"]);
  assert.equal((await connector.validate((async function* () { yield* items; })())).valid, true);
});

test("malformed XML is rejected while parsing and is not detected as WXR", async () => {
  await assert.rejects(collect(connector.extract(malformedFixture)), /Unable to parse WXR input/);
  assert.equal(await connector.detect(malformedFixture), false);
});

test("source-only capabilities are declared and unsupported operations use named errors", async () => {
  assert.deepEqual([...connector.capabilities()], ["stream-extract"]);
  await assert.rejects(connector.rollback("job-1"), (error) => {
    assert.ok(error instanceof UnsupportedCapabilityError);
    assert.equal(error.code, "UNSUPPORTED_CAPABILITY");
    assert.equal(error.capability, "rollback");
    return true;
  });
});
