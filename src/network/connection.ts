import { randomUUID } from 'crypto';
import { Encryption } from './encryption';
import { CommandError, RequestTimeoutError, InvalidConnectionError, MissingAgentActionError } from '../errors';
import { CommandStatusCode } from '../enums';
import { CommandErrorPacket, type AgentActionResponsePacket, type EncryptionResponsePacket, type CommandResponsePacket, type DataResponsePacket } from './packets';
import type { WebSocket } from 'ws';
import type { Network } from './network';
import type { AgentActionResult, PendingResponse } from '../types';


export class Connection {
  public readonly network: Network;
  
  public readonly ws: WebSocket;

  public readonly encryption: Encryption = new Encryption();

  public readonly identifier: string = randomUUID();

  public readonly pendingResponses = new Map<string, PendingResponse>();
  
  public readonly responseTimes: number[] = [];

  public readonly establishedAt: number = Date.now();

  constructor(network: Network, ws: WebSocket) {
    this.network = network;
    this.ws = ws;
  }

  public get isOpen() {
    return this.ws.readyState === this.ws.OPEN;
  }

  public send(payload: string | Buffer) {
    let data = payload;
    if (this.encryption.enabled) {
      data = this.encryption.encrypt(
        typeof payload === 'string' ? payload : payload.toString('utf-8')
      )
    }
    this.ws.send(data);
  }

  public onCommandResponse(requestId: string, packet: CommandResponsePacket | CommandErrorPacket): void {
    const data = this.pendingResponses.get(requestId);
    if (!data) return; //console.error('[Network] Received invalid command response', packet.data);

    if (packet instanceof CommandErrorPacket) {
      this.settle(requestId, data);
      data.reject(
        new CommandError(CommandStatusCode[packet.statusCode], packet.statusMessage, packet.statusCode)
      );
      return;
    }

    // An agent command answers with two frames sharing one requestId: this status-only
    // `commandResponse`, and an `action:agent` frame carrying the payload. Buffer this one
    // and keep waiting unless the `action:agent` frame already arrived out of order.
    if (data.expectsAgentAction) {
      // A failed agent command never produces an `action:agent` frame, so fail now instead
      // of waiting out the timeout.
      if (packet.statusCode < CommandStatusCode.Success) {
        this.settle(requestId, data);
        data.reject(
          new CommandError(CommandStatusCode[packet.statusCode], packet.statusMessage, packet.statusCode)
        );
        return;
      }

      data.commandResponse = packet;
      if (data.agentAction) this.completeAgentAction(requestId, data);
      return;
    }

    this.settle(requestId, data);
    data.resolve(packet);
  }

  /**
   * Handles the `action:agent` frame of an agent command.
   *
   * Completes the request immediately, folding in the paired `commandResponse` when it has
   * already been seen. Completing on this frame rather than waiting for both avoids
   * hanging when Minecraft delivers them out of order or omits the status frame.
   */
  public onAgentActionResponse(requestId: string, packet: AgentActionResponsePacket): void {
    const data = this.pendingResponses.get(requestId);
    if (!data) return console.error('[Network] Received unexpected agent action response', packet);

    data.agentAction = packet;
    this.completeAgentAction(requestId, data);
  }

  private completeAgentAction(requestId: string, data: PendingResponse): void {
    const packet = data.agentAction!;
    this.settle(requestId, data);

    const result: AgentActionResult = {
      ...packet.toAgentActionResult(),
      commandResponse: data.commandResponse?.toCommandResult(),
    };
    data.resolve(result);
  }

  public onEncryptionResponse(requestId: string, packet: EncryptionResponsePacket): void {
    const data = this.pendingResponses.get(requestId);
    if (!data) return console.error('[Network] Received unexpected encryption response', packet);

    this.settle(requestId, data);
    data.resolve(packet);
  }

  public onDataResponse(requestId: string, packet: DataResponsePacket): void {
    const data = this.pendingResponses.get(requestId);
    if (!data) return console.error('[Network] Received unexpected data response', packet);

    this.settle(requestId, data);
    data.resolve(packet);
  }

  /** Removes the pending entry, clears its timeout and records the round-trip time. */
  private settle(requestId: string, data: PendingResponse): void {
    this.pendingResponses.delete(requestId);
    clearTimeout(data.timeout);

    if (this.responseTimes.length > 20) this.responseTimes.shift();
    this.responseTimes.push(Date.now() - data.sentAt);
  }

  public awaitResponse<R>(
    requestId: string,
    timeoutDuration = 10_000,
    options?: { expectsAgentAction?: boolean },
  ): Promise<R> {
    const sentAt = Date.now();

    return new Promise<R>((resolve, reject) => {
      if (!this.isOpen) return reject(new InvalidConnectionError(this.identifier));

      const timeout = setTimeout(() => {
        const pending = this.pendingResponses.get(requestId);
        this.pendingResponses.delete(requestId);

        // A buffered `commandResponse` with no `action:agent` frame carries only a status
        // and none of the payload the caller asked for. Reporting it as a success would be
        // a silent empty result, so it is surfaced as a distinct failure instead.
        const buffered = pending?.commandResponse;
        if (buffered) {
          return reject(new MissingAgentActionError(buffered.statusCode, buffered.statusMessage));
        }

        reject(new RequestTimeoutError());
      }, timeoutDuration);

      this.pendingResponses.set(requestId, {
        resolve,
        reject,
        timeout,
        sentAt,
        expectsAgentAction: options?.expectsAgentAction,
      });
    });
  }

  public clearPendingResponses() {
    for (const { timeout, reject } of this.pendingResponses.values()) {
      clearTimeout(timeout);
      reject(
        new Error(`[Aborted] Connection closed before response was received.`)
      );
    }
  }
}
