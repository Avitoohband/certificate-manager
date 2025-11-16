import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Service for encrypting and decrypting sensitive data (e.g., private keys)
 * Uses AES-256-GCM for authenticated encryption
 */
@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly masterKey: Buffer;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('MASTER_ENCRYPTION_KEY');
    if (!key) {
      throw new Error('MASTER_ENCRYPTION_KEY must be set in environment variables');
    }
    // Expect base64-encoded 32-byte key
    this.masterKey = Buffer.from(key, 'base64');
    if (this.masterKey.length !== 32) {
      throw new Error('MASTER_ENCRYPTION_KEY must be 32 bytes (base64 encoded)');
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   * @returns Object containing encrypted data, IV, and auth tag
   */
  encrypt(plaintext: string): { encrypted: string; iv: string; tag: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.masterKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = createDecipheriv(
      this.algorithm,
      this.masterKey,
      Buffer.from(iv, 'base64'),
    );

    decipher.setAuthTag(Buffer.from(tag, 'base64'));

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

