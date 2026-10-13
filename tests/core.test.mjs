import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  CheckpointStore, createJobState, createRiskReport, markCompleted, outputPath,
  planMigration, renderMarkdown, safeSlug, validateManifest, validateOutput
} from "../packages/core/dist/index.js";
import { writeMarkdown } from "../packages/connectors/markdown/dist/index.js";

const sample = {
  id: "1", type: "post", title: "Hello: World", slug: "hello-world", body: "Body",
  categories: ["News"], tags: [], customFields: { mystery: "data" }
};

test("manifest is validated and deterministic fields are separated from unknown fields", () => {
  const plan = planMigration("source.xml", [sample], "/tmp/out");
  assert.equal(validateManifest(plan.manifest).items.length, 1);
  assert.equal(plan.manifest.mappings.find((entry) => entry.sourceField === "title").method, "deterministic");
  assert.equal(plan.manifest.mappings.find((entry) => entry.sourceField === "mystery").method, "manual");
  assert.deepEqual(plan.risks.unresolvedMappings, ["mystery"]);
  assert.throws(() => validateManifest({ ...plan.manifest, version: 99 }));
});

test("dry run renders safe Markdown without creating output", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "migrateme-dry-run-"));
  const output = path.join(root, "not-created");
  const plan = planMigration("source.xml", [sample], output);
  assert.match(plan.preview[0].content, /title: "Hello: World"/);
  await assert.rejects(stat(output), { code: "ENOENT" });
  await rm(root, { recursive: true, force: true });
});

test("slugs and resolved paths stay inside output root", () => {
  assert.equal(safeSlug("../../Bad title"), "bad-title");
  assert.equal(outputPath("/tmp/migrate", { ...sample, slug: "../../escape" }), "/tmp/migrate/escape.md");
  assert.match(renderMarkdown(sample), /^---\ntitle:/);
});

test("Markdown writes are idempotent and reject conflicting output", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "migrateme-output-"));
  try {
    assert.equal(await writeMarkdown((async function* () { yield sample; })(), root), 1);
    assert.equal(await writeMarkdown((async function* () { yield sample; })(), root), 1);
    const file = path.join(root, "hello-world.md");
    assert.match(await readFile(file, "utf8"), /Body/);
    const changed = { ...sample, body: "Different" };
    await assert.rejects(writeMarkdown((async function* () { yield changed; })(), root), /Refusing to overwrite/);
    const report = await validateOutput(planMigration("x", [sample], root).manifest, root);
    assert.equal(report.passed, true);
    assert.deepEqual(createRiskReport(planMigration("x", [sample], root).manifest).missingAssets, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("SQLite checkpoints persist completed item IDs for resume", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "migrateme-job-"));
  const filename = path.join(root, "jobs.sqlite");
  try {
    let store = new CheckpointStore(filename);
    let state = createJobState("job-1", store);
    state = markCompleted(state, "1", store);
    store.close();
    store = new CheckpointStore(filename);
    assert.deepEqual(createJobState("job-1", store).completedItemIds, ["1"]);
    store.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
