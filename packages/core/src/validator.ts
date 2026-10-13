import { createHash } from "node:crypto";
import { lookup as dnsLookup } from "node:dns";
import type { LookupAddress, LookupOptions } from "node:dns";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { MigrationManifest, Asset } from "./manifest.js";
import { outputPath, renderMarkdown } from "./markdown.js";

export type ValidationReport = {
  passed: boolean;
  expectedCount: number;
  foundCount: number;
  exceptionQueue: string[];
};

function isBlockedAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const octets = address.split(".").map(Number);
    const [first = 0, second = 0] = octets;
    return first === 0 || first === 10 || first === 127
      || (first === 100 && second >= 64 && second <= 127)
      || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168)
      || (first === 192 && second === 0 && [0, 2].includes(octets[2] ?? -1))
      || (first === 198 && ((second === 18 || second === 19) || (second === 51 && octets[2] === 100)))
      || (first === 203 && second === 0 && octets[2] === 113)
      || first >= 224;
  }

  if (isIP(address) !== 6) return true;
  const normalized = address.toLowerCase().split("%")[0] ?? address.toLowerCase();
  const dottedTail = normalized.match(/(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const expandedAddress = dottedTail
    ? normalized.replace(dottedTail, (() => {
      const [a = 0, b = 0, c = 0, d = 0] = dottedTail.split(".").map(Number);
      return `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
    })())
    : normalized;
  const [leftSide = "", rightSide] = expandedAddress.split("::");
  const parseGroups = (side: string) => side ? side.split(":").map((group) => Number.parseInt(group, 16)) : [];
  const left = parseGroups(leftSide);
  const right = parseGroups(rightSide ?? "");
  const groups = [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill(0), ...right];
  if (groups.length !== 8 || groups.some((group) => !Number.isInteger(group) || group < 0 || group > 0xffff)) {
    return true;
  }
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
    const mappedAddress = `${groups[6] >> 8}.${groups[6] & 255}.${groups[7] >> 8}.${groups[7] & 255}`;
    return isBlockedAddress(mappedAddress);
  }
  return groups.slice(0, 7).every((group) => group === 0) && [0, 1].includes(groups[7] ?? -1)
    || ((groups[0] ?? 0) & 0xfe00) === 0xfc00
    || ((groups[0] ?? 0) & 0xffc0) === 0xfe80
    || ((groups[0] ?? 0) & 0xff00) === 0xff00
    || (groups[0] === 0x2001 && groups[1] === 0x0db8);
}

function lookupAddresses(hostname: string): Promise<LookupAddress[]> {
  return new Promise((resolve, reject) => {
    dnsLookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
      if (error) reject(error);
      else resolve(addresses);
    });
  });
}

function requestAsset(url: URL, redirects = 0): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
        throw new Error("unsupported or invalid asset URL");
      }

      const hostname = url.hostname.replace(/^\[|\]$/g, "");
      const addresses = await lookupAddresses(hostname);
      if (!addresses.length) throw new Error("asset host has no addresses");
      if (addresses.some(({ address }) => isBlockedAddress(address))) {
        throw new Error("asset host resolves to a private or link-local address");
      }

      const safeLookup = (
        _hostname: string,
        options: LookupOptions,
        callback: (
          error: NodeJS.ErrnoException | null,
          address: string | LookupAddress[],
          family?: number
        ) => void
      ) => {
        const address = addresses[0];
        if (!address) {
          callback(Object.assign(new Error("asset host has no addresses"), { code: "ENOTFOUND" }), "", 0);
          return;
        }
        if ("all" in options && options.all) callback(null, [address]);
        else callback(null, address.address, address.family);
      };
      const request = (url.protocol === "https:" ? httpsRequest : httpRequest)({
        protocol: url.protocol,
        hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method: "HEAD",
        lookup: safeLookup
      }, (response) => {
        response.resume();
        const status = response.statusCode ?? 0;
        const location = response.headers.location;
        if ([301, 302, 303, 307, 308].includes(status) && location) {
          if (redirects >= 5) {
            reject(new Error("too many asset redirects"));
            return;
          }
          void requestAsset(new URL(location, url), redirects + 1).then(resolve, reject);
        } else if (status < 200 || status >= 300) {
          reject(new Error(`asset returned HTTP ${status}`));
        } else {
          resolve();
        }
      });
      request.setTimeout(5000, () => request.destroy(new Error("asset request timed out")));
      request.once("error", reject);
      request.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function validateAssetReachability(asset: Asset): Promise<string | undefined> {
  if (!/^https?:\/\//i.test(asset.source)) return;
  try {
    await requestAsset(new URL(asset.source));
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export async function validateOutput(
  manifest: MigrationManifest,
  outputRoot: string
): Promise<ValidationReport> {
  const exceptionQueue: string[] = [];
  let foundCount = 0;
  for (const item of manifest.items) {
    let content: string;
    try {
      content = await readFile(outputPath(outputRoot, item), "utf8");
      foundCount += 1;
    } catch {
      exceptionQueue.push(`${item.id}: output missing`);
      continue;
    }

    if (content !== renderMarkdown(item)) {
      exceptionQueue.push(`${item.id}: output fields or content mismatch`);
    }
    if (item.checksum?.destinationValue) {
      const digest = createHash("sha256").update(content).digest("hex");
      if (digest !== item.checksum.destinationValue) {
        exceptionQueue.push(`${item.id}: content checksum mismatch`);
      }
    }
  }
  for (const asset of manifest.assets) {
    if (asset.status === "missing") exceptionQueue.push(`Missing asset: ${asset.source}`);
    if (asset.status === "pending") exceptionQueue.push(`Asset not copied: ${asset.source}`);
    if (asset.status === "skipped") exceptionQueue.push(`Asset skipped: ${asset.source}`);

    const reachabilityError = await validateAssetReachability(asset);
    if (reachabilityError) {
      exceptionQueue.push(`Asset unreachable: ${asset.source} (${reachabilityError})`);
    }

    if (!asset.destination) {
      if (asset.status === "copied") exceptionQueue.push(`Asset destination missing: ${asset.source}`);
      continue;
    }

    const resolvedRoot = path.resolve(outputRoot);
    const assetPath = path.resolve(resolvedRoot, asset.destination);
    if (!assetPath.startsWith(`${resolvedRoot}${path.sep}`)) {
      exceptionQueue.push(`Asset path escapes output root: ${asset.source}`);
      continue;
    }
    try {
      const bytes = await readFile(assetPath);
      if (asset.checksum && createHash("sha256").update(bytes).digest("hex") !== asset.checksum) {
        exceptionQueue.push(`Asset checksum mismatch: ${asset.source}`);
      }
    } catch {
      exceptionQueue.push(`Asset missing: ${asset.source}`);
    }
  }
  return {
    passed: exceptionQueue.length === 0 && foundCount === manifest.items.length,
    expectedCount: manifest.items.length,
    foundCount,
    exceptionQueue
  };
}
