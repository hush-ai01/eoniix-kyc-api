import crypto from 'crypto';

const ENC_KEY = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'change_this_to_strong_secret', 'salt', 32);
const IV_LENGTH = 16;

export function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + tag + ':' + encrypted;
}

export function decrypt(encryptedString) {
  const [iv, tag, data] = encryptedString.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
