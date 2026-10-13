import assert from "node:assert/strict";
import { access, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRiskReport, planMigration } from "../packages/core/dist/index.js";

function item(overrides = {}) {
  return {
    id: "post-1",
    type: "post",
    title: "Hello: world",
    slug: "hello",
    body: "Markdown body",
    categories: ["News"],
    tags: ["Migration"],
    customFields: {},
    status: "planned",
    ...overrides
  };
}

test("dry-run returns golden Markdown previews and a summary without writing destination files", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "dry-run-"));
  const output = path.join(parent, "content");
  const result = planMigration("export.xml", [
    item(),
    item({ id: "post-2", title: "Second", slug: "hello" })
  ], output);

  assert.deepEqual(result.preview, [
    {
      path: path.join(output, "hello.md"),
      content: [
        "---",
        'title: "Hello: world"',
        'slug: "hello"',
        'type: "post"',
        "categories:",
        '  - "News"',
        "tags:",
        '  - "Migration"',
        "---",
        "",
        "Markdown body",
        ""
      ].join("\n")
    },
    {
      path: path.join(output, "hello-2.md"),
      content: [
        "---",
        'title: "Second"',
        'slug: "hello-2"',
        'type: "post"',
        "categories:",
        '  - "News"',
        "tags:",
        '  - "Migration"',
        "---",
        "",
        "Markdown body",
        ""
      ].join("\n")
    }
  ]);
  assert.deepEqual(result.summary, { itemCount: 2, previewCount: 2, riskCount: 0 });
  await assert.rejects(access(output), { code: "ENOENT" });
});

test("risk reports include unresolved mappings, unsupported fields, missing assets, and validation concerns", () => {
  const result = planMigration("export.xml", [
    item({
      title: " ",
      author: "Jane",
      links: ["https://example.com"],
      taxonomies: [{ name: "Series", terms: ["One"] }],
      customFields: { legacy_rating: "5" }
    })
  ], "/tmp/output", [{ source: "missing.jpg", status: "missing" }]);

  assert.deepEqual(result.risks, {
    unresolvedMappings: ["legacy_rating"],
    unsupportedFields: [
      "post-1.author",
      "post-1.links",
      "post-1.taxonomies",
      "post-1.customFields.legacy_rating"
    ],
    missingAssets: ["missing.jpg"],
    validationConcerns: ["Content post-1 has an empty title"]
  });

  const customManifest = {
    ...result.manifest,
    items: [{ ...item(), categories: "not-an-array" }]
  };
  assert.ok(createRiskReport(customManifest).validationConcerns.some((concern) => concern.includes("categories")));
});
