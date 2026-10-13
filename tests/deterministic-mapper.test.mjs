import assert from "node:assert/strict";
import test from "node:test";
import { deterministicMappings, FieldMappingSchema } from "../packages/core/dist/index.js";

const item = {
  id: "post-1",
  type: "post",
  title: "Hello",
  slug: "hello",
  date: "2025-01-02 03:04:05",
  body: "Content",
  categories: ["News"],
  tags: ["Migration"],
  featuredImage: "https://example.com/image.jpg",
  customFields: {},
  status: "planned"
};

test("standard WordPress fields map deterministically", () => {
  assert.deepEqual(deterministicMappings(item), [
    "title", "slug", "date", "body", "categories", "tags", "featuredImage"
  ].map((field) => ({
    sourceField: field,
    targetField: field,
    method: "deterministic"
  })));
});

test("optional standard fields are omitted when absent", () => {
  const mappings = deterministicMappings({
    ...item,
    date: undefined,
    featuredImage: undefined
  });

  assert.deepEqual(mappings.map(({ sourceField }) => sourceField), [
    "title", "slug", "body", "categories", "tags"
  ]);
  assert.ok(mappings.every(({ method }) => method === "deterministic"));
});

test("unknown custom fields are flagged for review", () => {
  const [mapping] = deterministicMappings({
    ...item,
    customFields: { legacy_rating: "5" }
  }).slice(-1);

  assert.deepEqual(mapping, {
    sourceField: "legacy_rating",
    targetField: "",
    method: "manual",
    rationale: "Unknown custom fields require review."
  });
  assert.deepEqual(FieldMappingSchema.parse(mapping), mapping);
  assert.equal(FieldMappingSchema.safeParse({
    ...mapping,
    method: "deterministic"
  }).success, false);
});
