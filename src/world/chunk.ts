import type { ChunkColumn } from '../types';

/** A `getchunkdata` response always describes a 16x16 area. */
const COLUMNS_PER_CHUNK = 256;
const CHUNK_WIDTH = 16;

/**
 * Expands the run-length encoding `getchunkdata` uses.
 *
 * @remarks
 * Tokens are comma-separated. `X*N` means X repeated **N+1** times, not N - the counts
 * only add up to 256 when read that way. A bare integer is a back-reference to an earlier
 * value in the same response, which is how large flat areas stay short.
 */
export function expandChunkRuns(raw: string): string[] {
  const trimmed = raw.replace(/^"|"$/g, '');
  if (!trimmed) return [];

  const out: string[] = [];
  for (const token of trimmed.split(',')) {
    const star = token.indexOf('*');
    if (star === -1) {
      out.push(token);
      continue;
    }
    const value = token.slice(0, star);
    const repeats = Number(token.slice(star + 1));
    for (let i = 0; i <= repeats; i++) out.push(value);
  }
  return out;
}

/**
 * Reconstructs a full height from the single byte the wire carries.
 *
 * @remarks
 * The byte is `(y - 1) & 0xFF`, verified across a range of placements. One byte cannot
 * distinguish heights 256 apart, so the requested Y is used as a ceiling: columns report
 * the highest block at or below it, so the answer is the largest candidate that does not
 * exceed it.
 */
function decodeHeight(byte: number, requestedY: number): number {
  const base = Math.floor((requestedY - byte - 1) / 256) * 256;
  const candidate = base + byte + 1;
  return candidate > requestedY ? candidate - 256 : candidate;
}

/**
 * Decodes one token into a column.
 *
 * @remarks
 * Each token is four base64-encoded bytes holding a little-endian value: read backwards,
 * the top three bytes are the map colour and the last is the height byte. A token that
 * does not decode - a back-reference that pointed nowhere, or an unexpected shape - yields
 * `undefined` rather than throwing, so one bad column cannot lose the other 255.
 */
function decodeColumn(token: string, index: number, requestedY: number): ChunkColumn | undefined {
  let bytes: Buffer;
  try {
    bytes = Buffer.from(`${token}==`, 'base64');
  } catch {
    return undefined;
  }
  if (bytes.length < 4) return undefined;

  const [blue, green, red, heightByte] = bytes;
  const hex = (n: number) => n.toString(16).padStart(2, '0');

  return {
    x: index % CHUNK_WIDTH,
    z: Math.floor(index / CHUNK_WIDTH),
    color: `#${hex(red)}${hex(green)}${hex(blue)}`,
    red,
    green,
    blue,
    y: decodeHeight(heightByte, requestedY),
    rawHeightByte: heightByte,
  };
}

/**
 * Turns a `getchunkdata` payload into 256 columns.
 *
 * @remarks
 * Back-references are resolved against the values already seen, which is what the bare
 * integers in the payload are. Anything that cannot be decoded is dropped, so a caller
 * that needs all 256 should check the length.
 */
export function decodeChunkData(raw: string, requestedY: number): ChunkColumn[] {
  const tokens = expandChunkRuns(raw);
  const decoded: (ChunkColumn | undefined)[] = [];
  const byIndex = new Map<number, string>();

  for (let i = 0; i < tokens.length && i < COLUMNS_PER_CHUNK; i++) {
    const token = tokens[i];
    const reference = /^-?\d+$/.test(token) ? byIndex.get(Number(token)) : token;
    if (reference === undefined) {
      decoded.push(undefined);
      continue;
    }
    byIndex.set(i, reference);
    decoded.push(decodeColumn(reference, i, requestedY));
  }

  return decoded.filter((c): c is ChunkColumn => c !== undefined);
}
