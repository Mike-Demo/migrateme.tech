import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

const connectorRoot = new URL("../packages/connectors/universal/", import.meta.url);
// The Universal build preserves extensionless relative imports.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(new URL("dist/", connectorRoot).href) &&
        specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      const file = new URL(`${specifier}.js`, context.parentURL);
      return nextResolve(existsSync(file) ? file.href : `${specifier}/index.js`, context);
    }
    return nextResolve(specifier, context);
  }
});
const { findDestination } = await import(new URL("dist/index.js", connectorRoot).href);
const staticHtmlDest = findDestination("static-html");
hooks.deregister();

function render(body, bodyFormat = "html") {
  return staticHtmlDest.render([{
    id: "post-1",
    type: "post",
    title: "Example",
    slug: "example",
    date: null,
    body,
    bodyFormat,
    excerpt: "",
    categories: [],
    tags: [],
    author: "",
    featuredImage: null,
    customFields: {},
    status: "published",
    provenance: { sourceFormat: "wxr", method: "imported" }
  }]).files[0].content;
}

test("web and package static HTML renderers stay identical", async () => {
  const packageSource = await readFile(new URL("src/destinations/static-html.ts", connectorRoot), "utf8");
  const webSource = await readFile(new URL(
    "../apps/web/universal/src/lib/destinations/static-html.ts", import.meta.url
  ), "utf8");
  assert.equal(webSource, packageSource);
});

test("static HTML bodies cannot inject active markup or break out of pre", () => {
  const payloads = [
    ["<script>alert(1)</script>", "&lt;script&gt;alert(1)&lt;/script&gt;"],
    ['<img src=x onerror="alert(1)">', "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"],
    ['<a href="javascript:alert(1)">link</a>', "&lt;a href=&quot;javascript:alert(1)&quot;&gt;link&lt;/a&gt;"],
    ["<iframe srcdoc='<script>alert(1)</script>'></iframe>", "&lt;iframe srcdoc=&#39;&lt;script&gt;alert(1)&lt;/script&gt;&#39;&gt;&lt;/iframe&gt;"],
    ["<object data=x></object><embed src=x><svg onload=alert(1)>", "&lt;object data=x&gt;&lt;/object&gt;&lt;embed src=x&gt;&lt;svg onload=alert(1)&gt;"],
    ["</pre><script>alert(1)</script>", "&lt;/pre&gt;&lt;script&gt;alert(1)&lt;/script&gt;"]
  ];
  for (const [body, escaped] of payloads) {
    const html = render(body);
    assert.ok(html.includes(`<pre class="html-source">${escaped}</pre>`));
    assert.ok(!html.includes(body));
    assert.equal((html.match(/<\/pre>/g) ?? []).length, 1);
  }
});

test("static HTML preserves benign content as literal source text", () => {
  for (const [body, escaped] of [
    ["<p>Hello & café</p>\n&lt;script&gt;", "&lt;p&gt;Hello &amp; café&lt;/p&gt;\n&amp;lt;script&amp;gt;"],
    ["", ""]
  ]) {
    assert.ok(render(body).includes(`<pre class="html-source">${escaped}</pre>`));
  }
});

test("static HTML keeps Markdown escaping and safely handles unknown formats", () => {
  const body = '# Heading\n</pre><script>alert("x")</script>';
  const escaped = '# Heading\n&lt;/pre&gt;&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;';
  assert.ok(render(body, "markdown").includes(`<pre class="markdown-source">${escaped}</pre>`));
  for (const format of [null, "unknown"]) {
    assert.ok(render(body, format).includes(`<pre class="html-source">${escaped}</pre>`));
  }
});
