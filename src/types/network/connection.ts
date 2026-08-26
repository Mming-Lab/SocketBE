import type { AgentActionResponsePacket, CommandResponsePacket } from '../../network/packets';

export interface PendingResponse<RES = any, REJ = any> {
  resolve: (data: RES) => void;
  reject: (error: REJ) => void;
  timeout: NodeJS.Timeout;
  sentAt: number;

  /**
   * Set when the request was sent on the `action:agent` channel, which answers with two
   * frames sharing one `requestId`. The request is only settled once the `action:agent`
   * frame arrives; a `commandResponse` alone is buffered rather than resolved.
   */
  expectsAgentAction?: boolean;

  /** Buffered `commandResponse` frame, held until the paired `action:agent` frame arrives. */
  commandResponse?: CommandResponsePacket;

  /** Buffered `action:agent` frame, held when it arrives before its `commandResponse`. */
  agentAction?: AgentActionResponsePacket;
}
