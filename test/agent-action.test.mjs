// Unit tests for the two-frame `action:agent` correlation in Connection.
//
// Minecraft answers a single `action:agent` request with two frames sharing one
// requestId: a status-only `commandResponse`, then an `action:agent` frame carrying the
// payload. These cases cover the orderings and failures a live client cannot be made to
// produce on demand.
//
// Run: node test/agent-action.test.mjs   (after `tsdown`)

import assert from 'node:assert/strict';
import {
  AgentActionResponsePacket,
  CommandErrorPacket,
  CommandResponsePacket,
  Connection,
  MissingAgentActionError,
  CommandError,
  RequestTimeoutError,
} from '../dist/index.mjs';

/** Minimal stand-ins: the correlation path touches neither the socket nor the network. */
const stubWs = { readyState: 1, OPEN: 1, send() {} };
const stubNetwork = {};

const newConnection = () => new Connection(stubNetwork, stubWs);

const commandResponse = (data) => CommandResponsePacket.deserialize(data);

const agentAction = (body, header) => AgentActionResponsePacket.deserialize(body, header);

const inspectHeader = { action: 8, actionName: 'inspect' };

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failed++;
    console.log(`  FAIL ${name}`);
    console.log(`       ${error.message}`);
  }
}

console.log('action:agent correlation');

await test('normal order: commandResponse then action:agent resolves with both', async () => {
  const conn = newConnection();
  const promise = conn.awaitResponse('req-1', 1000, { expectsAgentAction: true });

  conn.onCommandResponse('req-1', commandResponse({ statusCode: 0, statusMessage: 'ok' }));

  // The commandResponse alone must not settle the request.
  let settled = false;
  void promise.then(() => (settled = true));
  await new Promise((r) => setImmediate(r));
  assert.equal(settled, false, 'resolved on commandResponse alone');

  conn.onAgentActionResponse('req-1', agentAction({ blockName: 'coal_ore' }, inspectHeader));

  const result = await promise;
  assert.equal(result.action, 8);
  assert.equal(result.actionName, 'inspect');
  assert.deepEqual(result.body, { blockName: 'coal_ore' });
  assert.equal(result.commandResponse.statusMessage, 'ok');
  assert.equal(conn.pendingResponses.size, 0, 'pending entry not cleaned up');
});

await test('reversed order: action:agent first still resolves', async () => {
  const conn = newConnection();
  const promise = conn.awaitResponse('req-2', 1000, { expectsAgentAction: true });

  conn.onAgentActionResponse('req-2', agentAction({ blockName: 'stone' }, inspectHeader));

  const result = await promise;
  assert.deepEqual(result.body, { blockName: 'stone' });
  assert.equal(result.commandResponse, undefined, 'commandResponse should be absent');

  // The late commandResponse must be dropped without throwing.
  conn.onCommandResponse('req-2', commandResponse({ statusCode: 0, statusMessage: 'ok' }));
  assert.equal(conn.pendingResponses.size, 0);
});

await test('missing action:agent rejects with MissingAgentActionError, not a silent success', async () => {
  const conn = newConnection();
  const promise = conn.awaitResponse('req-3', 40, { expectsAgentAction: true });

  conn.onCommandResponse('req-3', commandResponse({ statusCode: 0, statusMessage: 'ok' }));

  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof MissingAgentActionError, `got ${error.constructor.name}`);
    assert.equal(error.statusCode, 0);
    assert.equal(error.statusMessage, 'ok');
    return true;
  });
  assert.equal(conn.pendingResponses.size, 0, 'timed-out entry leaked');
});

await test('no frames at all rejects with RequestTimeoutError', async () => {
  const conn = newConnection();
  const promise = conn.awaitResponse('req-4', 40, { expectsAgentAction: true });

  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof RequestTimeoutError, `got ${error.constructor.name}`);
    return true;
  });
  assert.equal(conn.pendingResponses.size, 0);
});

await test('failed command rejects immediately without waiting for the timeout', async () => {
  const conn = newConnection();
  const started = Date.now();
  const promise = conn.awaitResponse('req-5', 5000, { expectsAgentAction: true });

  conn.onCommandResponse(
    'req-5',
    commandResponse({ statusCode: -2147483647, statusMessage: 'Command not found' })
  );

  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof CommandError, `got ${error.constructor.name}`);
    return true;
  });
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 1000, `waited ${elapsed}ms; should fail fast`);
});

await test('error frame rejects with CommandError', async () => {
  const conn = newConnection();
  const promise = conn.awaitResponse('req-6', 1000, { expectsAgentAction: true });

  conn.onCommandResponse(
    'req-6',
    CommandErrorPacket.deserialize({ statusCode: -2147483647, statusMessage: 'boom' })
  );

  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof CommandError, `got ${error.constructor.name}`);
    return true;
  });
});

await test('interleaved requestIds stay isolated', async () => {
  const conn = newConnection();
  const a = conn.awaitResponse('req-a', 1000, { expectsAgentAction: true });
  const b = conn.awaitResponse('req-b', 1000, { expectsAgentAction: true });

  // Interleave the four frames so a naive single-slot buffer would cross them over.
  conn.onCommandResponse('req-a', commandResponse({ statusCode: 0, statusMessage: 'A' }));
  conn.onCommandResponse('req-b', commandResponse({ statusCode: 0, statusMessage: 'B' }));
  conn.onAgentActionResponse('req-b', agentAction({ blockName: 'b_block' }, inspectHeader));
  conn.onAgentActionResponse('req-a', agentAction({ blockName: 'a_block' }, inspectHeader));

  const [resA, resB] = await Promise.all([a, b]);
  assert.deepEqual(resA.body, { blockName: 'a_block' });
  assert.equal(resA.commandResponse.statusMessage, 'A');
  assert.deepEqual(resB.body, { blockName: 'b_block' });
  assert.equal(resB.commandResponse.statusMessage, 'B');
});

await test('100 concurrent agent commands all resolve with their own payload', async () => {
  const conn = newConnection();
  const ids = Array.from({ length: 100 }, (_, i) => `bulk-${i}`);
  const promises = ids.map((id) => conn.awaitResponse(id, 2000, { expectsAgentAction: true }));

  // Status frames first, in order; payload frames afterwards, in reverse.
  for (const id of ids) {
    conn.onCommandResponse(id, commandResponse({ statusCode: 0, statusMessage: id }));
  }
  for (const id of [...ids].reverse()) {
    conn.onAgentActionResponse(id, agentAction({ blockName: id }, inspectHeader));
  }

  const results = await Promise.all(promises);
  results.forEach((result, i) => {
    assert.equal(result.body.blockName, ids[i]);
    assert.equal(result.commandResponse.statusMessage, ids[i]);
  });
  assert.equal(conn.pendingResponses.size, 0);
});

await test('unknown requestId is ignored rather than throwing', async () => {
  const conn = newConnection();
  conn.onAgentActionResponse('never-sent', agentAction({}, inspectHeader));
  conn.onCommandResponse('never-sent', commandResponse({ statusCode: 0, statusMessage: '' }));
  assert.equal(conn.pendingResponses.size, 0);
});

await test('non-agent request is unaffected and resolves on commandResponse', async () => {
  const conn = newConnection();
  const promise = conn.awaitResponse('plain-1', 1000);

  conn.onCommandResponse('plain-1', commandResponse({ statusCode: 0, statusMessage: 'plain' }));

  const packet = await promise;
  assert.equal(packet.statusMessage, 'plain');
  assert.equal(conn.pendingResponses.size, 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
