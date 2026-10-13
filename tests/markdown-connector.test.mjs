import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { MarkdownConnector } from "../packages/connectors/markdown/dist/index.js";
import { UnsupportedCapabilityError } from "../packages/core/dist/index.js";

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

async function* items(values) {
  yield* values;
}

test("Markdown connector writes rendered frontmatter and Markdown under its output root", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "markdown-connector-"));
  const output = path.join(parent, "content");
  const connector = new MarkdownConnector();

  await connector.load(items([item()]), output);

  const files = await readdir(output);
  assert.deepEqual(files, ["hello.md"]);
  assert.equal(await readFile(path.join(output, files[0]), "utf8"), [
    "---",
    'title: "Hello: world"',
    'slug: "hello"',
    'type: "post"',
    'categories:',
    '  - "News"',
    'tags:',
    '  - "Migration"',
    "---",
    "",
    "Markdown body",
    ""
  ].join("\n"));
  assert.equal(await realpath(path.join(output, files[0])), path.join(await realpath(output), files[0]));
  assert.deepEqual(await connector.verify(output), { valid: true, issues: [] });
});

test("unsafe paths normalize safely and writes remain contained", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "markdown-connector-"));
  const output = path.join(parent, "content");
  const connector = new MarkdownConnector();

  await connector.load(items([
    item({ id: "traversal", slug: "../../outside" }),
    item({ id: "absolute", slug: path.join(parent, "escape") })
  ]), output);

  const files = await readdir(output);
  assert.equal(files.length, 2);
  assert.ok(files.every((file) => file.endsWith(".md")));
  assert.deepEqual((await readdir(parent)).sort(), ["content"]);
});

test("slug edge cases normalize unicode and empty values, cap long names, and avoid collisions", async () => {
  const output = await mkdtemp(path.join(os.tmpdir(), "markdown-connector-"));
  const connector = new MarkdownConnector();

  await connector.load(items([
    item({ id: "unicode", slug: "Crème brûlée" }),
    item({ id: "empty", slug: "!!!" }),
    item({ id: "long", slug: "x".repeat(300) }),
    item({ id: "duplicate-1", slug: "same" }),
    item({ id: "duplicate-2", slug: "same" })
  ]), output);

  const files = (await readdir(output)).sort();
  assert.deepEqual(files, [
    "creme-brulee.md",
    "same-2.md",
    "same.md",
    "untitled.md",
    `${"x".repeat(120)}.md`
  ]);
});

test("replacing a symlink does not write through it outside the output root", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "markdown-connector-"));
  const output = path.join(parent, "content");
  const outside = path.join(parent, "outside.md");
  const connector = new MarkdownConnector();
  await mkdir(output);
  await writeFile(outside, "outside data");
  await symlink(outside, path.join(output, "hello.md"));

  await connector.load(items([item()]), output);

  assert.equal(await readFile(outside, "utf8"), "outside data");
  assert.equal((await readFile(path.join(output, "hello.md"), "utf8")).includes("Markdown body"), true);
});

test("capabilities are explicit and unsupported operations throw the contract error", async () => {
  const connector = new MarkdownConnector();
  assert.deepEqual([...connector.capabilities()], ["markdown-frontmatter"]);
  await assert.rejects(connector.checkpoint("job", {}), (error) => {
    assert.ok(error instanceof UnsupportedCapabilityError);
    assert.equal(error.code, "UNSUPPORTED_CAPABILITY");
    assert.equal(error.capability, "checkpoint");
    return true;
  });
});
