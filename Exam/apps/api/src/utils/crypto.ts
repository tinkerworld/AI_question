import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY_RAW = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET || 'examos-ai-secure-master-encryption-key-2026';
// Derive 32-byte key using SHA-256
const MASTER_KEY = crypto.createHash('sha256').update(SECRET_KEY_RAW).digest();

/**
 * Encrypt a plaintext secret using AES-256-GCM.
 * Output format: iv_hex:authTag_hex:encrypted_hex
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext || plaintext.trim() === '') return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted secret string.
 */
export function decryptSecret(ciphertext: string): string {
  if (!ciphertext || ciphertext.trim() === '') return '';
  // Check if ciphertext is in iv:authTag:encrypted format
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    // If not encrypted (legacy or plain), return as-is
    return ciphertext;
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Mask an API key for safe frontend display (e.g. sk-...a1b2 or ••••••••••••).
 */
export function maskApiKey(key: string | null | undefined): string {
  if (!key || key.trim() === '') return '';
  const decrypted = decryptSecret(key);
  if (!decrypted || decrypted.trim() === '') return '';
  if (decrypted.length <= 8) return '••••••••••••';
  const prefix = decrypted.slice(0, 3);
  const suffix = decrypted.slice(-4);
  return `${prefix}...${suffix}`;
}
