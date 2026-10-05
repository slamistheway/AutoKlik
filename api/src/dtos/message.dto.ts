export class ConversationDto {
  otherUserId: number;
}
export class SendMessageDto {
  conversationId: number;
  body: string;
}
export class MessageImageDto {
  conversationId: number;
  body?: string;
}
export class ReadMessagesDto {
  conversationId: number;
  throughMessageId: number;
}
