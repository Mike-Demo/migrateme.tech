import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createWebServer } from "../apps/web/dist/index.js";

const fixture = fileURLToPath(new URL("./fixtures/wordpress-wxr.xml", import.meta.url));

async function withServer(run) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "migrateme-web-test-"));
  const server = createWebServer({ tempRoot });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await run(baseUrl, tempRoot);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function getPage(baseUrl, cookie) {
  return fetch(baseUrl, { headers: { cookie } });
}

async function upload(baseUrl, cookie, content) {
  return fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ fileName: "fixture.xml", content })
  });
}

async function advance(baseUrl, cookie, action, body = "") {
  return fetch(`${baseUrl}/${action}`, {
    method: "POST",
    headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
    body,
    redirect: "manual"
  });
}

test("fixture flows through inventory, mapping, dry run, explicit approval, migration, and validation", async () => {
  await withServer(async (baseUrl, tempRoot) => {
    const initial = await fetch(baseUrl);
    const cookie = initial.headers.get("set-cookie").split(";")[0];
    const initialHtml = await initial.text();
    assert.match(initialHtml, /<header>/);
    assert.match(initialHtml, /<nav aria-label="Migration progress">/);
    assert.match(initialHtml, /<main>/);
    assert.match(initialHtml, /<label for="source-file">WordPress WXR file<\/label>/);
    assert.match(initialHtml, /<button type="submit">Upload and inspect<\/button>/);
    assert.doesNotMatch(initialHtml, /tabindex="-1"/);
    assert.match(initialHtml, /:focus-visible/);

    const appScript = await fetch(`${baseUrl}/app.js`);
    assert.match(await appScript.text(), /addEventListener\("submit"/);

    const uploaded = await upload(baseUrl, cookie, await readFile(fixture, "utf8"));
    assert.equal(uploaded.status, 200);
    assert.match(await (await getPage(baseUrl, cookie)).text(), /<h2>Inventory<\/h2>/);

    assert.equal((await advance(baseUrl, cookie, "mapping")).status, 303);
    const mapping = await (await getPage(baseUrl, cookie)).text();
    assert.match(mapping, /<h2>Mapping Review<\/h2>/);
    assert.match(mapping, /title → title/);

    assert.equal((await advance(baseUrl, cookie, "dry-run")).status, 303);
    const preview = await (await getPage(baseUrl, cookie)).text();
    assert.match(preview, /<h2>Dry Run Preview<\/h2>/);
    for (const category of ["unresolvedMappings", "unsupportedFields", "missingAssets", "validationConcerns"]) {
      assert.match(preview, new RegExp(`<h4>${category}<\\/h4>`));
    }
    assert.match(preview, /name="approved" value="true" required/);
    assert.match(preview, /<button type="submit">Approve and migrate<\/button>/);
    assert.doesNotMatch(preview, /tabindex="-1"/);

    assert.equal((await advance(baseUrl, cookie, "approve")).status, 400);
    const workspace = path.join(tempRoot, (await readdir(tempRoot))[0]);
    assert.deepEqual((await readdir(workspace)).sort(), ["source.xml"]);

    assert.equal((await advance(baseUrl, cookie, "approve", "approved=true")).status, 303);
    const report = await (await getPage(baseUrl, cookie)).text();
    assert.match(report, /<h2>Validation Report<\/h2>/);
    assert.match(report, /Result: Passed/);
    assert.match(report, /Expected 3 items; found 3/);
    assert.ok((await readdir(workspace)).includes("content"));
    assert.ok((await readdir(path.join(workspace, "content"))).length > 0);
  });
});

test("fixture-derived markup is rendered as inert escaped text", async () => {
  await withServer(async (baseUrl) => {
    const initial = await fetch(baseUrl);
    const cookie = initial.headers.get("set-cookie").split(";")[0];
    let content = await readFile(fixture, "utf8");
    content = content.replace(
      "<title>Welcome to migration</title>",
      "<title><![CDATA[<script>alert(1)</script><img src=x onerror=alert(2)>]]></title>"
    ).replace(
      "<![CDATA[<p>CDATA <strong>content</strong>.</p>]]>",
      "<![CDATA[<script>alert(3)</script><img src=x onerror=alert(4)>]]>"
    );
    assert.equal((await upload(baseUrl, cookie, content)).status, 200);
    await advance(baseUrl, cookie, "mapping");
    await advance(baseUrl, cookie, "dry-run");
    const preview = await (await getPage(baseUrl, cookie)).text();
    assert.match(preview, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(preview, /&lt;img src=x onerror=alert\(2\)&gt;/);
    assert.match(preview, /&lt;script&gt;alert\(3\)&lt;\/script&gt;/);
    assert.doesNotMatch(preview, /<script>alert\([134]\)<\/script>/);
    assert.doesNotMatch(preview, /<img src=x onerror=/);
  });
});

test("upload failures do not expose internal exception details", async () => {
  await withServer(async (baseUrl) => {
    const initial = await fetch(baseUrl);
    const cookie = initial.headers.get("set-cookie").split(";")[0];
    const response = await upload(baseUrl, cookie, "<not a WXR export>");
    assert.equal(response.status, 400);
    const result = await response.json();
    assert.match(result.error, /valid WXR export/);
    assert.doesNotMatch(result.error, /Error:| at .+\(/);
  });
});
