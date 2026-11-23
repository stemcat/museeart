import { readFile } from "node:fs/promises";

const catalogueImage = /^https:\/\/collectionapi\.metmuseum\.org\/api\/collection\/v1\/iiif\/([1-9]\d*)\/[1-9]\d*\/main-image$/;

export class MetRateLimitError extends Error {}

/** A plain-text list of primary museum image URLs, one per line. */
export async function loadMetCatalogueLinks(path: string): Promise<Map<string, string>> {
  const links = new Map<string, string>();
  const lines = (await readFile(path, "utf8")).split("\n");
  for (const [index, line] of lines.entries()) {
    const url = line.trim();
    if (!url) continue;
    const match = catalogueImage.exec(url);
    if (!match) throw new Error(`Invalid Met catalogue image URL at line ${index + 1} of ${path}`);
    links.set(match[1], url);
  }
  return links;
}

export async function throwIfMetRateLimited(response: Response, url: string): Promise<void> {
  const retryAfter = response.headers.get("retry-after");
  if (response.ok || (response.status !== 429 && !retryAfter)) return;
  await response.body?.cancel();
  const message = `Met returned HTTP ${response.status} for ${url}`;
  throw new MetRateLimitError(retryAfter ? `${message} (Retry-After: ${retryAfter})` : message);
}

async function getMetResource(url: string, accept: string): Promise<Response> {
  const response = await fetch(url, {
    headers: { Accept: accept },
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  if (response.ok) return response;

  await throwIfMetRateLimited(response, url);
  await response.body?.cancel();
  throw new Error(`Met returned HTTP ${response.status} for ${url}`);
}

/** Validate a museum catalogue link before writing it to the artwork record. */
export async function verifyMetImage(sourceId: string, url: string): Promise<void> {
  if (catalogueImage.exec(url)?.[1] !== sourceId) {
    throw new Error(`Invalid catalogue image URL for Met object ${sourceId}`);
  }
  const response = await getMetResource(url, "image/jpeg");
  const reader = response.body?.getReader();
  if (!reader) throw new Error(`Empty image response for Met object ${sourceId}`);

  try {
    // Block pages can be HTTP 200. Check the first bytes, then close the stream.
    const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (type !== "image/jpeg") throw new Error(`Expected a JPEG for Met object ${sourceId}`);
    const signature = [0xff, 0xd8, 0xff];
    let offset = 0;
    while (offset < signature.length) {
      const { done, value } = await reader.read();
      if (done) throw new Error(`Truncated JPEG for Met object ${sourceId}`);
      for (const byte of value) {
        if (byte !== signature[offset]) throw new Error(`Invalid JPEG for Met object ${sourceId}`);
        offset++;
        if (offset === signature.length) return;
      }
    }
  } finally {
    await reader.cancel();
  }
}

export async function resolveMetImages(sourceId: string, links?: ReadonlyMap<string, string>) {
  if (!/^[1-9]\d*$/.test(sourceId)) throw new Error("Invalid Met object ID");
  const url = links ? links.get(sourceId) : await findCatalogueImage(sourceId);
  if (!url) throw new Error(`No catalogue image found for Met object ${sourceId}`);
  await verifyMetImage(sourceId, url);
  // The museum uses the same display-size image in its gallery and thumbnails.
  return { imageUrl: url, imageSmallUrl: url };
}

async function findCatalogueImage(sourceId: string): Promise<string | undefined> {
  const page = await getMetResource(
    `https://www.metmuseum.org/art/collection/search/${sourceId}`,
    "text/html",
  );
  const html = await page.text();
  // The catalogue renders the main photograph first, followed by alternate views.
  const objectImages = `https://collectionapi.metmuseum.org/api/collection/v1/iiif/${sourceId}/`;
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    const url = tag.match(/\ssrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (url?.startsWith(objectImages)) return url;
  }
}
