import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { MarkdownConnector } from "../packages/connectors/markdown/dist/index.js";
import { CheckpointStore, executeMigration } from "../packages/core/dist/index.js";

function item(id, overrides = {}) {
  return {
    id,
    type: "post",
    title: id,
    slug: "same-slug",
    body: `Body ${id}`,
    categories: [],
    tags: [],
    customFields: {},
    status: "planned",
    ...overrides
  };
}

function manifest(outputPath, items = [item("one"), item("two")]) {
  return {
    version: 1,
    source: { type: "wordpress-wxr", file: "export.xml" },
    destination: { connector: "markdown", outputPath },
    createdAt: "2026-10-13T16:00:00.000Z",
    items,
    mappings: [],
    assets: [],
    transformations: [],
    provenance: [],
    rollback: { enabled: false }
  };
}

async function outputFiles(output) {
  return Object.fromEntries(await Promise.all(
    (await readdir(output)).sort().map(async (file) => [file, await readFile(path.join(output, file), "utf8")])
  ));
}

test("execution requires approval before writing or persisting state", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "migration-approval-"));
  const output = path.join(parent, "content");
  const store = new CheckpointStore(path.join(parent, "jobs.sqlite"));
  let writes = 0;
  const connector = {
    async load() {
      writes += 1;
    }
  };

  await assert.rejects(
    executeMigration(manifest(output), {
      approved: false,
      jobId: "approval",
      store,
      connector
    }),
    /requires explicit approval/
  );
  assert.equal(writes, 0);
  assert.equal(store.load("approval"), undefined);
  store.close();
});

test("an interrupted run resumes from disk and matches uninterrupted output", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "migration-resume-"));
  const interruptedOutput = path.join(parent, "interrupted");
  const continuousOutput = path.join(parent, "continuous");
  const database = path.join(parent, "jobs.sqlite");
  const sourceItems = [item("one"), item("two"), item("three")];
  const migration = new MarkdownConnector();
  const firstStore = new CheckpointStore(database);
  let writes = 0;
  let interruptedManifest;

  await assert.rejects(executeMigration(manifest(interruptedOutput, sourceItems), {
    approved: true,
    jobId: "resume",
    store: firstStore,
    connector: {
      async load(items, output) {
        writes += 1;
        if (writes === 2) throw new Error("simulated crash");
        await migration.load(items, output);
      }
    }
  }), (error) => {
    assert.match(error.message, /simulated crash/);
    interruptedManifest = error.manifest;
    assert.deepEqual(error.manifest.items.map(({ status }) => status), ["migrated", "failed", "planned"]);
    assert.ok(error.manifest.items[1].checksum.sourceValue);
    return true;
  });
  const savedState = firstStore.load("resume");
  assert.deepEqual(savedState.completedItemIds, ["one"]);
  assert.deepEqual(savedState.completedItems.one.checksum, interruptedManifest.items[0].checksum);
  assert.ok(savedState.failedItems.two.checksum.sourceValue);
  firstStore.close();

  const resumedStore = new CheckpointStore(database);
  const resumed = await executeMigration(manifest(interruptedOutput, sourceItems), {
    approved: true,
    jobId: "resume",
    store: resumedStore,
    connector: migration
  });
  assert.equal(resumed.state.status, "completed");
  assert.deepEqual(resumed.manifest.items.map(({ status }) => status), ["migrated", "migrated", "migrated"]);
  assert.deepEqual(resumed.manifest.items[0].checksum, savedState.completedItems.one.checksum);
  assert.ok(resumed.manifest.items.every(({ checksum }) => checksum?.destinationValue));

  const continuousStore = new CheckpointStore(path.join(parent, "continuous.sqlite"));
  await executeMigration(manifest(continuousOutput, sourceItems), {
    approved: true,
    jobId: "continuous",
    store: continuousStore,
    connector: migration
  });
  assert.deepEqual(await outputFiles(interruptedOutput), await outputFiles(continuousOutput));
  resumedStore.close();
  continuousStore.close();
});

test("completed reruns skip checkpointed items and reject duplicate IDs", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "migration-idempotent-"));
  const output = path.join(parent, "content");
  const store = new CheckpointStore(path.join(parent, "jobs.sqlite"));
  const migration = new MarkdownConnector();
  const planned = manifest(output);

  await executeMigration(planned, {
    approved: true,
    jobId: "idempotent",
    store,
    connector: migration
  });

  let writes = 0;
  const rerun = await executeMigration(planned, {
    approved: true,
    jobId: "idempotent",
    store,
    connector: {
      async load() {
        writes += 1;
      }
    }
  });
  assert.equal(rerun.state.status, "completed");
  assert.equal(writes, 0);
  assert.deepEqual(Object.keys(await outputFiles(output)), ["same-slug-2.md", "same-slug.md"]);
  await assert.rejects(executeMigration(manifest(output, [item("duplicate"), item("duplicate")]), {
    approved: true,
    jobId: "duplicate",
    store,
    connector: migration
  }), /Duplicate migration item ID/);
  assert.equal(store.load("duplicate"), undefined);
  store.close();
});
