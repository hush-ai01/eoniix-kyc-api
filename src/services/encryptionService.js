import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const key = process.env.DB_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('DB_ENCRYPTION_KEY must be set as a 64-character hex string (32 bytes)');
  }
  return Buffer.from(key, 'hex');
}

export function encryptField(plaintext) {
  if (plaintext === null || plaintext === undefined) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptField(stored) {
  if (!stored) return null;
  const [ivHex, authTagHex, encryptedHex] = stored.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) return null;
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}
