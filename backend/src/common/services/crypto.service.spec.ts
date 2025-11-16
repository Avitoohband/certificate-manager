import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'MASTER_ENCRYPTION_KEY') {
        // Generate a valid 32-byte base64 key for testing
        return Buffer.from('a'.repeat(32)).toString('base64');
      }
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const plaintext = 'This is sensitive data that needs encryption';

      const { encrypted, iv, tag } = service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(iv).toBeDefined();
      expect(tag).toBeDefined();
      expect(encrypted).not.toBe(plaintext);

      const decrypted = service.decrypt(encrypted, iv, tag);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different IV for each encryption', () => {
      const plaintext = 'Same data';

      const result1 = service.encrypt(plaintext);
      const result2 = service.encrypt(plaintext);

      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.encrypted).not.toBe(result2.encrypted);
    });

    it('should fail to decrypt with wrong tag', () => {
      const plaintext = 'Secret message';
      const { encrypted, iv } = service.encrypt(plaintext);

      const wrongTag = Buffer.from('wrong-tag-data').toString('base64');

      expect(() => {
        service.decrypt(encrypted, iv, wrongTag);
      }).toThrow();
    });

    it('should fail to decrypt with wrong IV', () => {
      const plaintext = 'Secret message';
      const { encrypted, tag } = service.encrypt(plaintext);

      const wrongIv = Buffer.from('a'.repeat(16)).toString('base64');

      expect(() => {
        service.decrypt(encrypted, wrongIv, tag);
      }).toThrow();
    });

    it('should encrypt private keys correctly', () => {
      const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj
MzEfYyjiWA4R4/M2bS1+fWIcPm15A8vIQpm0g68oDgYMZeWSdUOz0jw6N8VU+v42
-----END PRIVATE KEY-----`;

      const { encrypted, iv, tag } = service.encrypt(privateKey);
      const decrypted = service.decrypt(encrypted, iv, tag);

      expect(decrypted).toBe(privateKey);
      expect(encrypted).not.toContain('BEGIN PRIVATE KEY');
    });
  });

  describe('initialization', () => {
    it('should throw error if MASTER_ENCRYPTION_KEY is not set', () => {
      const badConfigService = {
        get: jest.fn(() => null),
      };

      expect(() => {
        new CryptoService(badConfigService as any);
      }).toThrow('MASTER_ENCRYPTION_KEY must be set');
    });

    it('should throw error if MASTER_ENCRYPTION_KEY has wrong length', () => {
      const badConfigService = {
        get: jest.fn(() => Buffer.from('short').toString('base64')),
      };

      expect(() => {
        new CryptoService(badConfigService as any);
      }).toThrow('MASTER_ENCRYPTION_KEY must be 32 bytes');
    });
  });
});

