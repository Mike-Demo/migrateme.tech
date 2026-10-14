import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { MarkdownConnector } from "@migrateme/connector-markdown";
import { WordPressConnector } from "@migrateme/connector-wordpress";
import {
  CheckpointStore,
  executeMigration,
  planMigration,
  validateOutput
} from "@migrateme/core";
import type { ContentItem } from "@migrateme/core";

type Stage = "upload" | "inventory" | "mapping" | "dry-run" | "migration" | "validation";
type Plan = ReturnType<typeof planMigration>;
type Session = {
  id: string;
  stage: Stage;
  workspace?: string;
  counts?: Record<string, number>;
  fields?: string[];
  plan?: Plan;
  validation?: Awaited<ReturnType<typeof validateOutput>>;
};

const sessions = new Map<string, Session>();
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const uploadScript = `const form = document.querySelector("#upload-form");
form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#source-file");
  const file = input?.files?.[0];
  if (!file) return;
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  const status = document.querySelector("#upload-status");
  status.textContent = "Uploading and inspecting file…";
  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileName: file.name, content: await file.text() })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Upload failed");
    window.location.assign("/");
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Upload failed";
    button.disabled = false;
  }
});`;

function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]!);
}

function flowNavigation(stage: Stage): string {
  const stages: Array<[Stage, string]> = [
    ["upload", "Upload"],
    ["inventory", "Inventory"],
    ["mapping", "Mapping Review"],
    ["dry-run", "Dry Run Preview"],
    ["migration", "Migration"],
    ["validation", "Validation Report"]
  ];
  const activeStage = stage === "validation" ? "validation" : stage;
  return `<nav aria-label="Migration progress"><ol>${stages.map(([key, title]) =>
    `<li${key === activeStage ? ' aria-current="step"' : ""}>${escapeHtml(title)}</li>`
  ).join("")}</ol></nav>`;
}

function form(action: string, label: string): string {
  return `<form method="post" action="/${action}"><button type="submit">${label}</button></form>`;
}

function pageContent(session: Session): string {
  switch (session.stage) {
    case "upload":
      return `<h2>Upload a WordPress export</h2>
        <form id="upload-form">
          <label for="source-file">WordPress WXR file</label>
          <input id="source-file" name="file" type="file" accept=".xml,text/xml,application/xml" required>
          <button type="submit">Upload and inspect</button>
          <p id="upload-status" role="status" aria-live="polite"></p>
        </form>`;
    case "inventory":
      return `<h2>Inventory</h2>
        <p>Items found: ${escapeHtml(session.plan?.summary.itemCount ?? 0)}</p>
        <h3>Content counts</h3>
        <ul>${Object.entries(session.counts ?? {}).map(([name, count]) =>
          `<li>${escapeHtml(name)}: ${escapeHtml(count)}</li>`
        ).join("")}</ul>
        <h3>Source fields</h3>
        <ul>${(session.fields ?? []).map((field) => `<li>${escapeHtml(field)}</li>`).join("")}</ul>
        ${form("mapping", "Review mappings")}`;
    case "mapping":
      return `<h2>Mapping Review</h2>
        <ul>${(session.plan?.manifest.mappings ?? []).map((mapping) =>
          `<li>${escapeHtml(mapping.sourceField)} → ${escapeHtml(mapping.targetField)} (${escapeHtml(mapping.method)})</li>`
        ).join("")}</ul>
        ${form("dry-run", "View dry-run preview")}`;
    case "dry-run": {
      const plan = session.plan!;
      const risks = plan.risks;
      return `<h2>Dry Run Preview</h2>
        <p>${escapeHtml(plan.summary.itemCount)} items; ${escapeHtml(plan.summary.previewCount)} previews; ${escapeHtml(plan.summary.riskCount)} risks.</p>
        <h3>Risk report</h3>
        ${Object.entries(risks).map(([category, entries]) =>
          `<section><h4>${escapeHtml(category)}</h4><ul>${entries.length
            ? entries.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")
            : "<li>None</li>"}</ul></section>`
        ).join("")}
        <h3>Generated content preview</h3>
        ${plan.preview.map(({ path: outputPath, content }) =>
          `<section><h4>${escapeHtml(outputPath)}</h4><pre>${escapeHtml(content)}</pre></section>`
        ).join("")}
        <form method="post" action="/approve">
          <label><input type="checkbox" name="approved" value="true" required> I approve writing these files to the destination.</label>
          <button type="submit">Approve and migrate</button>
        </form>`;
    }
    case "migration":
      return `<h2>Migration</h2><p>Migration completed successfully.</p>`;
    case "validation": {
      const report = session.validation!;
      return `<h2>Migration</h2><p>Migration completed successfully.</p>
        <h2>Validation Report</h2>
        <p>Result: ${report.passed ? "Passed" : "Needs attention"}</p>
        <p>Expected ${escapeHtml(report.expectedCount)} items; found ${escapeHtml(report.foundCount)}.</p>
        <h3>Exceptions</h3>
        <ul>${report.exceptionQueue.length
          ? report.exceptionQueue.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")
          : "<li>None</li>"}</ul>`;
    }
  }
}

function renderPage(session: Session, error?: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MigrateMe migration</title>
  <style>
    body { font: 1rem/1.5 system-ui, sans-serif; margin: 0 auto; max-width: 52rem; padding: 1rem; }
    a, button, input { font: inherit; }
    button { cursor: pointer; }
    :focus-visible { outline: 3px solid #075dcc; outline-offset: 3px; }
    pre { overflow-wrap: anywhere; white-space: pre-wrap; }
    nav ol { display: flex; flex-wrap: wrap; gap: 1rem; padding-left: 1.5rem; }
  </style>
</head>
<body>
  <header><h1>MigrateMe</h1><p>Review your migration before anything is written.</p></header>
  ${flowNavigation(session.stage)}
  <main>${error ? `<p role="alert">${escapeHtml(error)}</p>` : ""}${pageContent(session)}</main>
  <script src="/app.js" defer></script>
</body>
</html>`;
}

function send(
  response: ServerResponse,
  status: number,
  contentType: string,
  body: string,
  cookie?: string
): void {
  response.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    ...(cookie ? { "set-cookie": cookie } : {})
  });
  response.end(body);
}

function cookieSession(request: IncomingMessage): { session: Session; isNew: boolean } {
  const cookies = request.headers.cookie?.split(";").map((cookie) => cookie.trim()) ?? [];
  const value = cookies.find((cookie) => cookie.startsWith("migrateme_session="))
    ?.slice("migrateme_session=".length);
  if (value && /^[0-9a-f-]{36}$/i.test(value)) {
    const existing = sessions.get(value);
    if (existing) return { session: existing, isNew: false };
  }
  const id = randomUUID();
  const session: Session = { id, stage: "upload" };
  sessions.set(id, session);
  return { session, isNew: true };
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_UPLOAD_BYTES + 64 * 1024) throw new Error("Request is too large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function parseForm(body: Buffer): URLSearchParams {
  return new URLSearchParams(body.toString("utf8"));
}

function respondError(response: ServerResponse, session: Session, error: unknown, cookie?: string): void {
  const message = error instanceof Error ? error.message : String(error);
  send(response, 400, "text/html; charset=utf-8", renderPage(session, message), cookie);
}

export function createWebServer(options: { tempRoot?: string } = {}): Server {
  return createServer(async (request, response) => {
    const { session, isNew } = cookieSession(request);
    const cookie = isNew ? `migrateme_session=${session.id}; Path=/; HttpOnly; SameSite=Lax` : undefined;
    const url = new URL(request.url ?? "/", "http://localhost");

    try {
      if (request.method === "GET" && url.pathname === "/app.js") {
        send(response, 200, "text/javascript; charset=utf-8", uploadScript, cookie);
        return;
      }
      if (request.method === "GET" && url.pathname === "/") {
        send(response, 200, "text/html; charset=utf-8", renderPage(session), cookie);
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/upload") {
        if (session.stage !== "upload") throw new Error("Upload is only available at the start of a migration");
        const body = await readBody(request);
        let upload: unknown;
        try {
          upload = JSON.parse(body.toString("utf8"));
        } catch {
          throw new Error("Upload must contain a file");
        }
        if (!upload || typeof upload !== "object" || !("content" in upload)
          || typeof upload.content !== "string" || !upload.content) {
          throw new Error("Upload must contain a non-empty file");
        }
        if (Buffer.byteLength(upload.content, "utf8") > MAX_UPLOAD_BYTES) {
          throw new Error("File exceeds the 10 MB upload limit");
        }

        session.workspace = await mkdtemp(path.join(options.tempRoot ?? os.tmpdir(), "migrateme-web-"));
        const sourcePath = path.join(session.workspace, "source.xml");
        await writeFile(sourcePath, upload.content, "utf8");
        const source = new WordPressConnector();
        if (!await source.detect(sourcePath)) throw new Error("The uploaded file is not a valid WordPress WXR export");
        const counts = (await source.inspect(sourcePath)).counts;
        const items: ContentItem[] = [];
        for await (const item of source.extract(sourcePath)) items.push(source.map(item));
        const outputPath = path.join(session.workspace, "content");
        session.plan = planMigration(sourcePath, items, outputPath);
        session.counts = counts;
        session.fields = [...new Set(items.flatMap((item) => [
          ...Object.keys(item).filter((field) => field !== "customFields"),
          ...Object.keys(item.customFields)
        ]))].sort();
        session.stage = "inventory";
        send(response, 200, "application/json; charset=utf-8", JSON.stringify({ ok: true }), cookie);
        return;
      }
      if (request.method === "POST" && url.pathname === "/mapping") {
        if (session.stage !== "inventory") throw new Error("Review the inventory before mappings");
        session.stage = "mapping";
      } else if (request.method === "POST" && url.pathname === "/dry-run") {
        if (session.stage !== "mapping") throw new Error("Review mappings before the dry run");
        session.stage = "dry-run";
      } else if (request.method === "POST" && url.pathname === "/approve") {
        if (session.stage !== "dry-run" || !session.workspace || !session.plan) {
          throw new Error("A dry-run preview is required before migration");
        }
        const body = await readBody(request);
        if (parseForm(body).get("approved") !== "true") {
          throw new Error("Migration requires explicit approval");
        }
        const store = new CheckpointStore(path.join(session.workspace, "jobs.sqlite"));
        let result;
        try {
          result = await executeMigration(session.plan.manifest, {
            approved: true,
            jobId: session.id,
            store,
            connector: new MarkdownConnector()
          });
        } finally {
          store.close();
        }
        session.stage = "migration";
        session.plan.manifest = result.manifest;
        session.validation = await validateOutput(result.manifest, result.manifest.destination.outputPath);
        session.stage = "validation";
      } else {
        send(response, 404, "text/plain; charset=utf-8", "Not found", cookie);
        return;
      }
      response.writeHead(303, { location: "/", "cache-control": "no-store", ...(cookie ? { "set-cookie": cookie } : {}) });
      response.end();
    } catch (error) {
      if (url.pathname === "/api/upload") {
        const message = error instanceof Error ? error.message : String(error);
        send(response, 400, "application/json; charset=utf-8", JSON.stringify({ error: message }), cookie);
      } else {
        respondError(response, session, error, cookie);
      }
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  createWebServer().listen(3000, "127.0.0.1", () => {
    process.stdout.write("MigrateMe web app listening at http://127.0.0.1:3000\n");
  });
}
