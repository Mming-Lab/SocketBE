// Unit tests for the getchunkdata decoder.
//
// `getchunkdata` is one of the commands that exists only over the WebSocket, so it is not
// in /help and its shape had to be worked out by measurement: place a known block, read
// the layer back, see which token moved.
//
// Everything asserted here comes from that. The colours below were produced by placing
// those exact blocks; the height relation was established by placing one block at five
// different heights and watching only the fourth byte move.
//
// Run: node test/chunk-data.test.mjs   (after `tsdown`)

import assert from 'node:assert/strict';
import { decodeChunkData, expandChunkRuns } from '../dist/index.mjs';

/** Read back after `setblock` at the column that decodes to index 117. */
const MEASURED_COLOURS = {
  diamond_block: ['1dtcYw', '#5cdbd5'],
  gold_block: ['Te76Yw', '#faee4d'],
  redstone_block: ['AAD/Yw', '#ff0000'],
  lapis_block: ['/4BKYw', '#4a80ff'],
  coal_block: ['GRkZYw', '#191919'],
};

/** One diamond block, placed at each of these heights in turn. */
const MEASURED_HEIGHTS = { 100: '1dtcYw', 101: '1dtcZA', 102: '1dtcZQ', 110: '1dtcbQ', 150: '1dtclQ' };

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failed++;
    console.log(`  FAIL ${name}`);
    console.log(`       ${error.message}`);
  }
}

console.log('run-length expansion');

test('X*N means N+1 copies, not N', () => {
  // The counts only reach 256 when read this way, which is how the convention was settled.
  assert.deepEqual(expandChunkRuns('a*2'), ['a', 'a', 'a']);
  assert.deepEqual(expandChunkRuns('a,b*1,c'), ['a', 'b', 'b', 'c']);
});

test('a real payload expands to exactly 256 columns', () => {
  // Captured whole from a live client.
  const raw = '"cHBwzQ*15,YGBgzQ*239"';
  assert.equal(expandChunkRuns(raw).length, 256);
});

test('a payload mixing tokens and back-references still reaches 256', () => {
  const raw = '"cHBw1g*4,cHBw4A,cHBw5g*9,YGBg1g*4,YGBg4A,YGBg5g*9,5*4,21,22*9,6*5,22*28,T09P5Q,22*14,6,22*155"';
  assert.equal(expandChunkRuns(raw).length, 256);
});

console.log('colour decoding');

for (const [block, [token, expected]] of Object.entries(MEASURED_COLOURS)) {
  test(`${block} decodes to ${expected}`, () => {
    const [column] = decodeChunkData(token, 100);
    assert.equal(column.color, expected);
  });
}

console.log('height decoding');

test('the fourth byte carries the height, not the alpha', () => {
  for (const [y, token] of Object.entries(MEASURED_HEIGHTS)) {
    const [column] = decodeChunkData(token, Number(y));
    assert.equal(column.y, Number(y), `token ${token} should decode to y ${y}`);
    assert.equal(column.color, '#5cdbd5', 'the colour must not move with the height');
  }
});

test('a column below the requested ceiling decodes to its own height', () => {
  // Asking for y 100 over open ground returned the terrain instead, with byte 196. That
  // is (-59 - 1) & 0xFF, and -59 was the ground there.
  const groundToken = Buffer.from([0x33, 0x7f, 0xd8, 196]).toString('base64').replace(/=+$/, '');
  const [column] = decodeChunkData(groundToken, 100);
  assert.equal(column.y, -59);
});

console.log('layout');

test('index maps to z * 16 + x, not x * 16 + z', () => {
  // Settled by placing a block at local (5, 7) and finding it at index 117.
  const filler = 'AAAAAA';
  const marker = '1dtcYw';
  const tokens = Array.from({ length: 256 }, (_, i) => (i === 117 ? marker : filler));
  const columns = decodeChunkData(tokens.join(','), 100);

  assert.equal(columns.length, 256);
  assert.equal(columns[117].x, 5);
  assert.equal(columns[117].z, 7);
  assert.equal(columns[117].color, '#5cdbd5');
});

console.log('robustness');

test('a back-reference resolves to the value it points at', () => {
  const columns = decodeChunkData('1dtcYw,0', 100);
  assert.equal(columns[1].color, columns[0].color);
});

test('an undecodable token is dropped rather than thrown', () => {
  const columns = decodeChunkData('1dtcYw,!!,Te76Yw', 100);
  assert.equal(columns.length, 2);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
