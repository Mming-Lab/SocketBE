export enum MessagePurpose {
  Subscribe = 'subscribe',
  Unsubscribe = 'unsubscribe',
  Event = 'event',
  Error = 'error',
  CommandRequest = 'commandRequest',
  CommandResponse = 'commandResponse',
  Encrypt = 'ws:encrypt',
  DataResponse = 'data',
  BlockDataRequest = 'data:block',
  ItemDataRequest = 'data:item',
  MobDataRequest = 'data:mob',
  /**
   * Dedicated channel for agent commands, introduced in Bedrock 1.18.30.
   * Used for both the request and the response frame.
   */
  AgentAction = 'action:agent',
}
