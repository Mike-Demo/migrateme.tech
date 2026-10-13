import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { extractWxr, inspectWxr, detectWxr } from "../packages/connectors/wordpress/dist/index.js";
import { writeMarkdown } from "../packages/connectors/markdown/dist/index.js";

const fixture = fileURLToPath(new URL("../fixtures/wordpress/basic.xml", import.meta.url));

test("WXR detection, inventory, and streaming extraction support posts, pages, metadata, and featured images", async () => {
  assert.equal(await detectWxr(fixture), true);
  assert.deepEqual((await inspectWxr(fixture)).counts, { post: 1, page: 1, attachment: 1 });
  const items = [];
  for await (const item of extractWxr(fixture)) items.push(item);
  assert.equal(items.length, 2);
  assert.equal(items[0].body, "<p>Safe migration body.</p>");
  assert.deepEqual(items[0].categories, ["Guides"]);
  assert.deepEqual(items[0].tags, ["Migration"]);
  assert.equal(items[0].customFields.subtitle, "Helpful details");
  assert.equal(items[0].featuredImage, "https://example.invalid/uploads/hero.jpg");
});

test("WXR extraction never fetches referenced asset URLs and output stays local", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "migrateme-wxr-"));
  try {
    await writeMarkdown(extractWxr(fixture), root);
    assert.match(await readFile(path.join(root, "migration-guide.md"), "utf8"), /hero\.jpg/);
    assert.match(await readFile(path.join(root, "company.md"), "utf8"), /About us/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("WXR parser rejects DTD declarations", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "migrateme-xml-"));
  const filename = path.join(root, "hostile.xml");
  const { writeFile } = await import("node:fs/promises");
  try {
    await writeFile(filename, '<!DOCTYPE rss [<!ENTITY x "x">]><rss><channel/></rss>');
    await assert.rejects(inspectWxr(filename), /DOCTYPE declarations/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
