import {createCipheriv, createDecipheriv, randomBytes} from 'node:crypto';

export function getMessageEncryptionKey(): Buffer {
  const value = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error('MESSAGE_ENCRYPTION_KEY must contain a persistent 32-byte key encoded as 64 hex characters.');
  }
  return Buffer.from(value, 'hex');
}

export function encryptMessageContent(content: Buffer, context: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getMessageEncryptionKey(), nonce, {authTagLength: 16});
  cipher.setAAD(Buffer.from(context, 'utf8'));
  const encrypted = Buffer.concat([cipher.update(content), cipher.final()]);
  return `v1:${nonce.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptMessageContent(content: string, context: string): Buffer {
  const parts = content.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Invalid encrypted message format.');
  const nonce = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  if (nonce.length !== 12 || tag.length !== 16) throw new Error('Invalid encrypted message metadata.');
  const decipher = createDecipheriv('aes-256-gcm', getMessageEncryptionKey(), nonce, {authTagLength: 16});
  decipher.setAAD(Buffer.from(context, 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64')), decipher.final()]);
}

export function messageBodyContext(conversationId: number, senderId: number): string {
  return `message-body:${conversationId}:${senderId}`;
}
