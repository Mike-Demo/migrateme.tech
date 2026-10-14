import assert from "node:assert/strict";
import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const cli = path.join(root, "packages/cli/dist/index.js");
const input = path.join(root, "tests/fixtures/wordpress-wxr.xml");

function execute(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
}

test("CLI plans and dry-runs through core without writing destination files", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "migrateme-cli-plan-"));
  const output = path.join(parent, "content");
  const manifest = path.join(parent, "manifest.json");

  for (const command of ["plan", "dry-run"]) {
    const result = execute([command, "--input", input, "--output", output, "--manifest", manifest]);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.command, command);
    assert.ok(report.summary.itemCount > 0);
  }
  assert.ok(JSON.parse(await readFile(manifest, "utf8")).items.length > 0);
  await assert.rejects(readdir(output), { code: "ENOENT" });
});

test("migrate fails closed without --approve and executes/validates after approval", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "migrateme-cli-migrate-"));
  const output = path.join(parent, "content");
  const manifest = path.join(parent, "manifest.json");
  const stateDb = path.join(parent, "jobs.sqlite");

  const planned = execute(["plan", "--input", input, "--output", output, "--manifest", manifest]);
  assert.equal(planned.status, 0, planned.stderr);
  const rejected = execute(["migrate", "--manifest", manifest, "--state-db", stateDb, "--job-id", "job-1"]);
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /requires explicit approval.*--approve/);
  await assert.rejects(readdir(output), { code: "ENOENT" });
  await assert.rejects(access(stateDb), { code: "ENOENT" });

  const migrated = execute(["migrate", "--manifest", manifest, "--state-db", stateDb, "--job-id", "job-1", "--approve"]);
  assert.equal(migrated.status, 0, migrated.stderr);
  assert.equal(JSON.parse(migrated.stdout).state.status, "completed");

  const validated = execute(["validate", "--manifest", manifest]);
  assert.equal(validated.status, 0, validated.stderr);
  assert.equal(JSON.parse(validated.stdout).report.passed, true);

  await rm(output, { recursive: true });
  const invalid = execute(["validate", "--manifest", manifest]);
  assert.equal(invalid.status, 1);
  assert.equal(JSON.parse(invalid.stdout).report.passed, false);

  const job = execute(["job", "--state-db", stateDb, "--job-id", "job-1"]);
  assert.equal(job.status, 0, job.stderr);
  assert.equal(JSON.parse(job.stdout).state.status, "completed");
});

test("CLI rejects missing required flags and unknown commands", () => {
  const missing = execute(["plan", "--input", input]);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Missing required option --output/);

  const unknown = execute(["not-a-command"]);
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /Unknown command: not-a-command/);
});
