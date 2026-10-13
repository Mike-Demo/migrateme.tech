import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { OllamaProvider } from "../packages/ai-mapper/dist/index.js";

async function withOllama(responseValue, testFn) {
  let posted;
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    posted = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ response: JSON.stringify(responseValue) }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    await testFn(new OllamaProvider("test", `http://127.0.0.1:${address.port}`), () => posted);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("AI mapping limits samples and accepts only a known target", async () => {
  await withOllama({
    sourceField: "subtitle", proposedTargetField: "description", confidence: 0.8,
    rationale: "It describes the page.", alternativeTargets: ["summary"]
  }, async (provider, getRequest) => {
    const result = await provider.proposeMapping("subtitle", ["description", "summary"], ["x".repeat(500)]);
    assert.equal(result.proposedTargetField, "description");
    const prompt = getRequest().prompt;
    assert.match(prompt, /untrusted data/);
    assert.equal(prompt.includes("x".repeat(101)), false);
  });
});

test("malformed and hallucinated AI mappings fall back to manual review", async () => {
  await withOllama({
    sourceField: "subtitle", proposedTargetField: "invented", confidence: 1,
    rationale: "Guess", alternativeTargets: []
  }, async (provider) => {
    assert.equal(await provider.proposeMapping("subtitle", ["description"], ["short"]), null);
  });
});
