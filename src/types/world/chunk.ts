/**
 * One column of a chunk, as reported by `getchunkdata`.
 *
 * @remarks
 * The command does not return block identifiers. It returns what a map would draw: for
 * each of the 16x16 columns, the colour of the highest block at or below the requested Y,
 * and how high that block is.
 */
export interface ChunkColumn {
  /** Offset within the chunk, 0-15. */
  x: number;
  /** Offset within the chunk, 0-15. */
  z: number;
  /** Map colour, `#rrggbb`. */
  color: string;
  red: number;
  green: number;
  blue: number;
  /**
   * Height of the block this colour came from.
   *
   * @remarks
   * The wire carries a single byte, so this is only the low 8 bits of the real height:
   * a column at y 100 and one at y 356 are indistinguishable. It is reconstructed against
   * the requested Y, which bounds it from above, so it is right whenever the chunk's
   * terrain sits within 256 blocks below that ceiling - true of any ordinary world.
   */
  y: number;
  /** The low byte as it arrived, for callers that would rather do their own arithmetic. */
  rawHeightByte: number;
}

export interface ChunkData {
  dimension: string;
  chunkX: number;
  chunkZ: number;
  /** The Y that was asked for. Columns report the highest block at or below it. */
  requestedY: number;
  /** All 256 columns, ordered `z * 16 + x`. */
  columns: ChunkColumn[];
  /** The undecoded string, in case the encoding needs revisiting. */
  raw: string;
}

/** Dimensions `getchunkdata` accepts. Measured: these three parse, other spellings do not. */
export type ChunkDimension = 'overworld' | 'nether' | 'the_end';

/** What `summon` reports back. */
export interface SummonResult {
  /** Namespaced identifier, e.g. `minecraft:chicken`. */
  entityType: string;
  spawnPos: { x: number, y: number, z: number };
  /** The new entity's unique id, as a string. */
  uId: string;
  wasSpawned: boolean;
}
