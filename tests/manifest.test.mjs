import assert from "node:assert/strict";
import test from "node:test";
import {
  ContentItemSchema,
  MigrationManifestSchema,
  validateManifest
} from "../packages/core/dist/index.js";

const validManifest = {
  version: 1,
  source: { type: "wordpress-wxr", file: "export.xml" },
  destination: { connector: "markdown", outputPath: "./content" },
  createdAt: "2026-10-13T16:00:00.000Z",
  items: [{
    id: "post-1",
    type: "post",
    title: "Hello",
    slug: "hello",
    body: "Content",
    categories: ["News"],
    tags: ["Migration"],
    taxonomies: [{ name: "category", terms: ["News"] }],
    author: "Editor",
    links: ["https://example.com/related"],
    customFields: { source: "wordpress" },
    destinationId: "hello",
    checksum: {
      algorithm: "sha256",
      sourceValue: "source-hash"
    },
    status: "planned"
  }],
  mappings: [{
    sourceField: "title",
    targetField: "title",
    method: "deterministic"
  }],
  assets: [],
  transformations: [],
  provenance: [],
  rollback: { enabled: false }
};

test("manifest schema validates and applies canonical defaults", () => {
  const item = ContentItemSchema.parse({
    id: "post-1",
    type: "post",
    title: "Hello",
    slug: "hello",
    body: "Content"
  });

  assert.deepEqual(item.categories, []);
  assert.deepEqual(item.tags, []);
  assert.deepEqual(item.customFields, {});
  assert.equal(item.status, "planned");
  assert.deepEqual(validateManifest(validManifest), validManifest);
});

test("manifest schema rejects invalid enums, timestamps, and unknown fields", () => {
  assert.equal(MigrationManifestSchema.safeParse({
    ...validManifest,
    version: 2
  }).success, false);

  assert.equal(MigrationManifestSchema.safeParse({
    ...validManifest,
    createdAt: "not-a-timestamp"
  }).success, false);

  assert.equal(MigrationManifestSchema.safeParse({
    ...validManifest,
    unexpected: true
  }).success, false);

  assert.equal(ContentItemSchema.safeParse({
    ...validManifest.items[0],
    status: "unknown"
  }).success, false);
});

test("manifest serialization round-trips without data loss", () => {
  const parsed = validateManifest(validManifest);
  const roundTripped = JSON.parse(JSON.stringify(parsed));

  assert.deepEqual(validateManifest(roundTripped), parsed);
});
