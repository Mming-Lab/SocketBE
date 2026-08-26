import type { AgentActionType, MessagePurpose, Packet } from '../../enums';

export type IHeader = EventHeader | CommandHeader | ErrorHeader | EncryptHeader | DataResponseHeader | AgentActionHeader;

export interface EventHeader extends BaseHeader {
  messagePurpose: MessagePurpose.Subscribe | MessagePurpose.Unsubscribe | MessagePurpose.Event;
  eventName: Packet;
}

export interface CommandHeader extends BaseHeader {
  messagePurpose: MessagePurpose.CommandRequest | MessagePurpose.CommandResponse;
}

export interface ErrorHeader extends BaseHeader {
  messagePurpose: MessagePurpose.Error;
}

export interface EncryptHeader extends BaseHeader {
  messagePurpose: MessagePurpose.Encrypt;
}

export interface DataRequestHeader extends BaseHeader {
  messagePurpose: MessagePurpose.BlockDataRequest | MessagePurpose.ItemDataRequest | MessagePurpose.MobDataRequest;
}

export interface DataResponseHeader extends BaseHeader {
  messagePurpose: MessagePurpose.DataResponse;
  dataType: string;
  type: number;
}


/**
 * Header of an `action:agent` frame. Used in both directions: the request carries only the
 * base fields, while the response adds the action discriminator and its name.
 */
export interface AgentActionHeader extends BaseHeader {
  messagePurpose: MessagePurpose.AgentAction;
  action?: AgentActionType;
  actionName?: string;
}
interface BaseHeader {
  version: number;
  requestId: string;
  messagePurpose: MessagePurpose;
  messageType?: string;
}

export interface IPacket<T = Record<string, unknown>> {
  header: IHeader;
  body: T;
}
