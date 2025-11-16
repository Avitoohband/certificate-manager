import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { Certificate, CertificateStatus, CertificateType } from './entities/certificate.entity';
import { CryptoService } from '../../common/services/crypto.service';
import { CertificateCryptoService } from '../../common/services/certificate-crypto.service';
import { AuditService } from '../audit/audit.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';

describe('CertificatesService', () => {
  let service: CertificatesService;

  const mockCertificate: Certificate = {
    id: 'cert-123',
    commonName: 'example.com',
    organization: 'Test Org',
    organizationUnit: null,
    country: 'US',
    state: null,
    locality: null,
    subjectAltNames: ['www.example.com'],
    type: CertificateType.RSA_2048,
    status: CertificateStatus.ACTIVE,
    serialNumber: '1234567890',
    certificate: '-----BEGIN CERTIFICATE-----',
    encryptedPrivateKey: 'encrypted-key',
    privateKeyIV: 'iv',
    privateKeyTag: 'tag',
    validFrom: new Date('2024-01-01'),
    validTo: new Date('2025-01-01'),
    revokedAt: null,
    revocationReason: null,
    metadata: {},
    ownerId: 'user-123',
    owner: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isExpiringSoon: false,
    isExpired: false,
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    })),
  };

  const mockCryptoService = {
    encrypt: jest.fn(() => ({
      encrypted: 'encrypted-data',
      iv: 'iv-data',
      tag: 'tag-data',
    })),
    decrypt: jest.fn(() => '-----BEGIN PRIVATE KEY-----'),
  };

  const mockCertCryptoService = {
    generateCertificate: jest.fn(() => ({
      certificate: '-----BEGIN CERTIFICATE-----',
      privateKey: '-----BEGIN PRIVATE KEY-----',
      serialNumber: '1234567890',
      validFrom: new Date('2024-01-01'),
      validTo: new Date('2025-01-01'),
    })),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificatesService,
        { provide: getRepositoryToken(Certificate), useValue: mockRepository },
        { provide: CryptoService, useValue: mockCryptoService },
        { provide: CertificateCryptoService, useValue: mockCertCryptoService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<CertificatesService>(CertificatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a certificate successfully', async () => {
      const createDto: CreateCertificateDto = {
        commonName: 'example.com',
        organization: 'Test Org',
        country: 'US',
        type: CertificateType.RSA_2048,
        validityDays: 365,
      };

      mockRepository.create.mockReturnValue(mockCertificate);
      mockRepository.save.mockResolvedValue(mockCertificate);

      const result = await service.create('user-123', createDto);

      expect(mockCertCryptoService.generateCertificate).toHaveBeenCalledWith(
        expect.objectContaining({
          commonName: 'example.com',
          organization: 'Test Org',
          type: CertificateType.RSA_2048,
        }),
      );
      expect(mockCryptoService.encrypt).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
      expect(result).toEqual(mockCertificate);
    });
  });

  describe('findOne', () => {
    it('should return certificate when found and user has access', async () => {
      mockRepository.findOne.mockResolvedValue(mockCertificate);

      const result = await service.findOne('cert-123', 'user-123', 'user');

      expect(result).toEqual(mockCertificate);
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException when certificate not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('cert-123', 'user-123', 'user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own certificate', async () => {
      mockRepository.findOne.mockResolvedValue(mockCertificate);

      await expect(service.findOne('cert-123', 'other-user', 'user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow admin to access any certificate', async () => {
      mockRepository.findOne.mockResolvedValue(mockCertificate);

      await service.findOne('cert-123', 'admin-user', 'admin');

      expect(mockRepository.findOne).toHaveBeenCalled();
    });
  });

  describe('revoke', () => {
    it('should revoke certificate successfully', async () => {
      mockRepository.findOne.mockResolvedValue(mockCertificate);
      mockRepository.save.mockResolvedValue({
        ...mockCertificate,
        status: CertificateStatus.REVOKED,
        revokedAt: new Date(),
        revocationReason: 'Test reason',
      });

      const result = await service.revoke('cert-123', 'user-123', 'user', 'Test reason');

      expect(result.status).toBe(CertificateStatus.REVOKED);
      expect(result.revocationReason).toBe('Test reason');
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });

  describe('renew', () => {
    it('should renew certificate successfully', async () => {
      mockRepository.findOne.mockResolvedValue(mockCertificate);
      mockRepository.save.mockResolvedValue(mockCertificate);
      mockRepository.create.mockReturnValue(mockCertificate);

      await service.renew('cert-123', 'user-123', 'user');

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CertificateStatus.EXPIRED,
        }),
      );
      expect(mockCertCryptoService.generateCertificate).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when trying to renew revoked certificate', async () => {
      const revokedCert = { ...mockCertificate, status: CertificateStatus.REVOKED };
      mockRepository.findOne.mockResolvedValue(revokedCert);

      await expect(service.renew('cert-123', 'user-123', 'user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getPrivateKey', () => {
    it('should decrypt and return private key', async () => {
      mockRepository.findOne.mockResolvedValue(mockCertificate);

      const result = await service.getPrivateKey('cert-123', 'user-123', 'user');

      expect(mockCryptoService.decrypt).toHaveBeenCalledWith(
        mockCertificate.encryptedPrivateKey,
        mockCertificate.privateKeyIV,
        mockCertificate.privateKeyTag,
      );
      expect(result).toBe('-----BEGIN PRIVATE KEY-----');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.any(String),
        }),
      );
    });
  });

  describe('findExpiring', () => {
    it('should return certificates expiring within specified days', async () => {
      mockRepository.find.mockResolvedValue([mockCertificate]);

      const result = await service.findExpiring(30);

      expect(result).toEqual([mockCertificate]);
      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CertificateStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  describe('updateExpiringStatus', () => {
    it('should update active certificates to expiring status', async () => {
      mockRepository.update.mockResolvedValue({ affected: 5 });

      const result = await service.updateExpiringStatus();

      expect(result).toBe(5);
      expect(mockRepository.update).toHaveBeenCalled();
    });
  });

  describe('updateExpiredStatus', () => {
    it('should update active certificates to expired status', async () => {
      mockRepository.update.mockResolvedValue({ affected: 3 });

      const result = await service.updateExpiredStatus();

      expect(result).toBe(3);
      expect(mockRepository.update).toHaveBeenCalled();
    });
  });
});
