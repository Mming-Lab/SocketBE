import { BasePacket } from './base';
import { MessagePurpose, Packet, type AgentActionType } from '../../enums';
import { PacketClass } from '../decorator';
import type { AgentActionResult } from '../../types';

/**
 * Response frame for an agent command sent with the `action:agent` message purpose.
 *
 * The header carries `action` and `actionName`; the body carries the payload. Mojang does
 * not document the body's field names, so it is passed through verbatim rather than
 * mapped onto named properties.
 */
@PacketClass(Packet.AgentActionResponse, MessagePurpose.AgentAction)
export class AgentActionResponsePacket extends BasePacket {
  public data!: Record<string, any>;

  public action!: AgentActionType;

  public actionName!: string;

  public toAgentActionResult<T extends Record<string, unknown> = Record<string, unknown>>(): AgentActionResult<T> {
    return {
      action: this.action,
      actionName: this.actionName,
      body: this.data as T,
    };
  }

  public static deserialize(
    data: Record<string, any> | undefined,
    header?: Record<string, any>
  ): AgentActionResponsePacket {
    const packet = new AgentActionResponsePacket();
    packet.data = data ?? {};
    packet.action = header?.action as AgentActionType;
    packet.actionName = header?.actionName as string;

    return packet;
  }
}
