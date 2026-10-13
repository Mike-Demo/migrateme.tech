import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { renderMarkdown, validateOutput } from "../packages/core/dist/index.js";

function item(overrides = {}) {
  return {
    id: "post-1",
    type: "post",
    title: "Hello",
    slug: "hello",
    body: "Content",
    categories: [],
    tags: [],
    customFields: {},
    status: "migrated",
    ...overrides
  };
}

function manifest(items = [], assets = []) {
  return {
    version: 1,
    source: { type: "wordpress-wxr", file: "export.xml" },
    destination: { connector: "markdown", outputPath: "./content" },
    createdAt: "2026-10-13T16:00:00.000Z",
    items,
    mappings: [],
    assets,
    transformations: [],
    provenance: [],
    rollback: { enabled: false }
  };
}

test("validation reconciles item counts, rendered fields, checksums, and copied assets", async () => {
  const output = await mkdtemp(path.join(os.tmpdir(), "validator-"));
  const contentItem = item();
  const rendered = renderMarkdown(contentItem);
  contentItem.checksum = {
    algorithm: "sha256",
    sourceValue: "source",
    destinationValue: createHash("sha256").update(rendered).digest("hex")
  };
  await writeFile(path.join(output, "hello.md"), rendered);
  await mkdir(path.join(output, "assets"));
  const assetData = Buffer.from("image bytes");
  await writeFile(path.join(output, "assets", "image.png"), assetData);

  const report = await validateOutput(manifest([contentItem], [{
    source: "source:image.png",
    destination: "assets/image.png",
    checksum: createHash("sha256").update(assetData).digest("hex"),
    status: "copied"
  }]), output);

  assert.deepEqual(report, {
    passed: true,
    expectedCount: 1,
    foundCount: 1,
    exceptionQueue: []
  });
});

test("validation reports missing output and field and checksum mismatches", async () => {
  const output = await mkdtemp(path.join(os.tmpdir(), "validator-"));
  const contentItem = item({
    checksum: { algorithm: "sha256", sourceValue: "source", destinationValue: "expected" }
  });
  await writeFile(path.join(output, "hello.md"), "---\ntitle: \"Wrong\"\n---\n\nContent\n");

  const report = await validateOutput(manifest([contentItem, item({ id: "missing", slug: "missing" })]), output);

  assert.equal(report.passed, false);
  assert.equal(report.expectedCount, 2);
  assert.equal(report.foundCount, 1);
  assert.ok(report.exceptionQueue.includes("post-1: output fields or content mismatch"));
  assert.ok(report.exceptionQueue.includes("post-1: content checksum mismatch"));
  assert.ok(report.exceptionQueue.includes("missing: output missing"));
});

test("network asset checks refuse private and link-local IP addresses", async () => {
  const output = await mkdtemp(path.join(os.tmpdir(), "validator-"));
  const report = await validateOutput(manifest([], [
    { source: "http://127.0.0.1/private", status: "copied" },
    { source: "http://169.254.169.254/latest/meta-data", status: "copied" },
    { source: "http://[::1]/private", status: "copied" },
    { source: "http://[fe80::1]/link-local", status: "copied" },
    { source: "http://[::ffff:127.0.0.1]/mapped-private", status: "copied" }
  ]), output);

  assert.equal(report.passed, false);
  assert.ok(report.exceptionQueue.some((exception) =>
    exception.includes("127.0.0.1") && exception.includes("private or link-local")));
  assert.ok(report.exceptionQueue.some((exception) =>
    exception.includes("169.254.169.254") && exception.includes("private or link-local")));
  assert.ok(report.exceptionQueue.some((exception) =>
    exception.includes("[::1]") && exception.includes("private or link-local")));
  assert.ok(report.exceptionQueue.some((exception) =>
    exception.includes("[fe80::1]") && exception.includes("private or link-local")));
  assert.ok(report.exceptionQueue.some((exception) =>
    exception.includes("[::ffff:127.0.0.1]") && exception.includes("private or link-local")));
});
