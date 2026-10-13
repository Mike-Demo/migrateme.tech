import type { ModelProvider } from "./model-provider.js";

export interface OllamaProviderOptions {
  model: string;
  endpoint?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class OllamaProvider implements ModelProvider {
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: OllamaProviderOptions) {
    this.endpoint = options.endpoint ?? "http://localhost:11434/api/generate";
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? fetch;

    if (!options.model.trim()) {
      throw new Error("Ollama model is required.");
    }
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) {
      throw new Error("Ollama timeout must be a positive number.");
    }
  }

  async generate(prompt: string): Promise<string> {
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.options.model,
        prompt,
        stream: false,
        format: "json"
      }),
      signal: AbortSignal.timeout(this.timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed with status ${response.status}.`);
    }

    const result: unknown = await response.json();
    if (
      typeof result !== "object" ||
      result === null ||
      !("response" in result) ||
      typeof result.response !== "string"
    ) {
      throw new Error("Ollama returned an invalid response.");
    }
    return result.response;
  }
}
