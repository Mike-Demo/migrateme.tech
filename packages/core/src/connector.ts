import type { ContentItem } from "./manifest.js";

export type ConnectorCapability =
  | "stream-extract"
  | "markdown-frontmatter"
  | "checkpoint"
  | "rollback";

export class UnsupportedCapabilityError extends Error {
  constructor(readonly capability: ConnectorCapability) {
    super(`Unsupported capability: ${capability}`);
    this.name = "UnsupportedCapabilityError";
  }
}

export interface MigrationConnector {
  detect(input: string): Promise<boolean>;
  authenticate(): Promise<void>;
  inspect(input: string): Promise<{ counts: Record<string, number> }>;
  extract(input: string): AsyncIterable<ContentItem>;
  map(item: ContentItem): ContentItem;
  validate(items: AsyncIterable<ContentItem>): Promise<{ valid: boolean; issues: string[] }>;
  load(items: AsyncIterable<ContentItem>, output: string): Promise<void>;
  verify(output: string): Promise<{ valid: boolean; issues: string[] }>;
  checkpoint(jobId: string, value: unknown): Promise<void>;
  resume(jobId: string): Promise<unknown>;
  rollback(jobId: string): Promise<void>;
  capabilities(): ReadonlySet<ConnectorCapability>;
}

export function requireCapabilities(
  connector: Pick<MigrationConnector, "capabilities">,
  required: readonly ConnectorCapability[]
): void {
  const available = connector.capabilities();
  for (const capability of required) {
    if (!available.has(capability)) throw new UnsupportedCapabilityError(capability);
  }
}
