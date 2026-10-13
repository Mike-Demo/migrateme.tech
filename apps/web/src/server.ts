import { createServer } from "node:http";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { planMigration, validateOutput } from "@migrateme/core";
import { writeMarkdown } from "@migrateme/markdown";
import { extractWxr, inspectWxr } from "@migrateme/wordpress";

const plans = new Map<string, { source: string; manifest: ReturnType<typeof planMigration>["manifest"]; output: string }>();
const outputRoot = path.resolve(process.env.MIGRATEME_OUTPUT ?? "migrated");
const htmlPath = fileURLToPath(new URL("../src/index.html", import.meta.url));
const jsPath = fileURLToPath(new URL("../src/app.js", import.meta.url));
const uploadLimit = 100 * 1024 * 1024;

async function readJson(request: AsyncIterable<Buffer>): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error("Request too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; object-src 'none'");
  try {
    if (request.method === "GET" && request.url === "/") {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(await readFile(htmlPath));
      return;
    }
    if (request.method === "GET" && request.url === "/app.js") {
      response.setHeader("content-type", "text/javascript; charset=utf-8");
      response.end(await readFile(jsPath));
      return;
    }
    if (request.method === "POST" && request.url === "/api/plan") {
      if (!["text/xml", "application/xml"].includes(request.headers["content-type"] ?? "")) {
        response.writeHead(415).end("Send an XML file");
        return;
      }
      const source = path.join(tmpdir(), `migrateme-${randomUUID()}.xml`);
      let bytes = 0;
      await pipeline(
        request,
        new Transform({
          transform(chunk: Buffer, _encoding, callback) {
            bytes += chunk.length;
            if (bytes > uploadLimit) callback(new Error("Upload exceeds 100 MiB"));
            else callback(null, chunk);
          }
        }),
        createWriteStream(source, { flags: "wx" })
      );
      try {
        const [inventory, items] = await Promise.all([
          inspectWxr(source),
          (async () => {
            const result = [];
            for await (const item of extractWxr(source)) result.push(item);
            return result;
          })()
        ]);
        const plan = planMigration(source, items, outputRoot);
        const id = randomUUID();
        plans.set(id, { source, manifest: plan.manifest, output: outputRoot });
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({
          planId: id,
          inventory,
          mappings: plan.manifest.mappings,
          risks: plan.risks,
          preview: plan.preview.slice(0, 3)
        }));
      } catch (error) {
        await rm(source, { force: true });
        throw error;
      }
      return;
    }
    if (request.method === "POST" && request.url === "/api/execute") {
      const approval = z.object({ planId: z.string(), approved: z.literal(true) }).parse(await readJson(request));
      const plan = plans.get(approval.planId);
      if (!plan) {
        response.writeHead(404).end("Plan not found");
        return;
      }
      await writeMarkdown(extractWxr(plan.source), plan.output);
      const validation = await validateOutput(plan.manifest, plan.output);
      plans.delete(approval.planId);
      await rm(plan.source, { force: true });
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ validation, itemCount: plan.manifest.items.length }));
      return;
    }
    response.writeHead(404).end("Not found");
  } catch (error) {
    response.writeHead(400, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Request failed" }));
  }
});

await mkdir(tmpdir(), { recursive: true });
server.listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? "127.0.0.1");
