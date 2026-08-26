import { Packet } from '../enums';
import {
  NetworkHandler,
  type AgentActionResponsePacket,
  type Connection,
} from '../network';
import type { IHeader } from '../types';

export class AgentActionResponseHandler extends NetworkHandler {
  public static readonly packet = Packet.AgentActionResponse;

  public handle(
    packet: AgentActionResponsePacket,
    connection: Connection,
    header: IHeader
  ): void {
    connection.onAgentActionResponse(header.requestId, packet);
  }
}
