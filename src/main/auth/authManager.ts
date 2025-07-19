import * as bcrypt from 'bcryptjs';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

class AuthManager {
  private readonly SALT_ROUNDS = 12; // Aumentamos la seguridad
  private readonly ENCRYPTION_KEY: Buffer;
  private readonly ALGORITHM = 'aes-256-gcm';

  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || Buffer.from(key, 'hex').length !== 32) {
      throw new Error('Invalid encryption key. Must be a 32-byte hex string');
    }
    this.ENCRYPTION_KEY = Buffer.from(key, 'hex');
  }

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  encrypt(data: string): string {
    try {
      const iv = randomBytes(12); // GCM recommended IV length
      const cipher = createCipheriv(this.ALGORITHM, this.ENCRYPTION_KEY, iv);

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${(error as Error).message}`);
    }
  }

  decrypt(encryptedData: string): string {
    try {
      const [ivHex, authTagHex, data] = encryptedData.split(':');

      if (!ivHex || !authTagHex || !data) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = createDecipheriv(this.ALGORITHM, this.ENCRYPTION_KEY, iv);

      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${(error as Error).message}`);
    }
  }
}

export default AuthManager;
