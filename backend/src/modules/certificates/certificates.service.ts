import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Certificate, CertificateStatus } from './entities/certificate.entity';
import { CryptoService } from '../../common/services/crypto.service';
import { CertificateCryptoService } from '../../common/services/certificate-crypto.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(Certificate)
    private certificatesRepository: Repository<Certificate>,
    private cryptoService: CryptoService,
    private certCryptoService: CertificateCryptoService,
    private auditService: AuditService,
  ) {}

  async create(userId: string, createDto: CreateCertificateDto): Promise<Certificate> {
    // Generate certificate using node-forge
    const generated = this.certCryptoService.generateCertificate({
      commonName: createDto.commonName,
      organization: createDto.organization,
      organizationUnit: createDto.organizationUnit,
      country: createDto.country,
      state: createDto.state,
      locality: createDto.locality,
      subjectAltNames: createDto.subjectAltNames || [],
      validityDays: createDto.validityDays || 365,
      type: createDto.type,
    });

    // Encrypt private key
    const { encrypted, iv, tag } = this.cryptoService.encrypt(generated.privateKey);

    // Create certificate record
    const certificate = this.certificatesRepository.create({
      commonName: createDto.commonName,
      organization: createDto.organization,
      organizationUnit: createDto.organizationUnit,
      country: createDto.country,
      state: createDto.state,
      locality: createDto.locality,
      subjectAltNames: createDto.subjectAltNames || [],
      type: createDto.type,
      serialNumber: generated.serialNumber,
      certificate: generated.certificate,
      encryptedPrivateKey: encrypted,
      privateKeyIV: iv,
      privateKeyTag: tag,
      validFrom: generated.validFrom,
      validTo: generated.validTo,
      status: CertificateStatus.ACTIVE,
      ownerId: userId,
      metadata: createDto.metadata || {},
    });

    const saved = await this.certificatesRepository.save(certificate);

    // Audit log
    await this.auditService.log({
      action: AuditAction.CERT_CREATED,
      userId,
      resourceType: 'certificate',
      resourceId: saved.id,
      success: true,
    });

    return saved;
  }

  async findAll(
    userId: string,
    userRole: string,
    page = 1,
    limit = 20,
    status?: CertificateStatus,
  ): Promise<{ certificates: Certificate[]; total: number }> {
    const queryBuilder = this.certificatesRepository.createQueryBuilder('cert');

    // Non-admins can only see their own certificates
    if (userRole !== 'admin') {
      queryBuilder.where('cert.ownerId = :userId', { userId });
    }

    if (status) {
      queryBuilder.andWhere('cert.status = :status', { status });
    }

    queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('cert.createdAt', 'DESC');

    const [certificates, total] = await queryBuilder.getManyAndCount();

    return { certificates, total };
  }

  async findOne(id: string, userId: string, userRole: string): Promise<Certificate> {
    const certificate = await this.certificatesRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    // Check ownership
    if (userRole !== 'admin' && certificate.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this certificate');
    }

    // Audit log
    await this.auditService.log({
      action: AuditAction.CERT_VIEWED,
      userId,
      resourceType: 'certificate',
      resourceId: id,
      success: true,
    });

    return certificate;
  }

  async update(
    id: string,
    userId: string,
    userRole: string,
    updateDto: UpdateCertificateDto,
  ): Promise<Certificate> {
    const certificate = await this.findOne(id, userId, userRole);

    Object.assign(certificate, {
      metadata: updateDto.metadata || certificate.metadata,
    });

    const updated = await this.certificatesRepository.save(certificate);

    // Audit log
    await this.auditService.log({
      action: AuditAction.CERT_UPDATED,
      userId,
      resourceType: 'certificate',
      resourceId: id,
      success: true,
    });

    return updated;
  }

  async revoke(id: string, userId: string, userRole: string, reason: string): Promise<Certificate> {
    const certificate = await this.findOne(id, userId, userRole);

    certificate.status = CertificateStatus.REVOKED;
    certificate.revokedAt = new Date();
    certificate.revocationReason = reason;

    const updated = await this.certificatesRepository.save(certificate);

    // Audit log
    await this.auditService.log({
      action: AuditAction.CERT_REVOKED,
      userId,
      resourceType: 'certificate',
      resourceId: id,
      metadata: { reason },
      success: true,
    });

    return updated;
  }

  async renew(id: string, userId: string, userRole: string): Promise<Certificate> {
    const oldCert = await this.findOne(id, userId, userRole);

    if (oldCert.status === CertificateStatus.REVOKED) {
      throw new ForbiddenException('Cannot renew a revoked certificate');
    }

    // Mark old certificate as expired
    oldCert.status = CertificateStatus.EXPIRED;
    await this.certificatesRepository.save(oldCert);

    // Create new certificate with same properties
    const newCert = await this.create(userId, {
      commonName: oldCert.commonName,
      organization: oldCert.organization,
      organizationUnit: oldCert.organizationUnit,
      country: oldCert.country,
      state: oldCert.state,
      locality: oldCert.locality,
      subjectAltNames: oldCert.subjectAltNames,
      type: oldCert.type,
      validityDays: 365,
      metadata: oldCert.metadata,
    });

    // Audit log
    await this.auditService.log({
      action: AuditAction.CERT_RENEWED,
      userId,
      resourceType: 'certificate',
      resourceId: id,
      metadata: { newCertId: newCert.id },
      success: true,
    });

    return newCert;
  }

  async getPrivateKey(id: string, userId: string, userRole: string): Promise<string> {
    const certificate = await this.findOne(id, userId, userRole);

    // Decrypt private key
    const decrypted = this.cryptoService.decrypt(
      certificate.encryptedPrivateKey,
      certificate.privateKeyIV,
      certificate.privateKeyTag,
    );

    // Audit log - sensitive operation
    await this.auditService.log({
      action: AuditAction.PRIVATE_KEY_ACCESSED,
      userId,
      resourceType: 'certificate',
      resourceId: id,
      success: true,
    });

    return decrypted;
  }

  async findExpiring(days: number): Promise<Certificate[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    return this.certificatesRepository.find({
      where: {
        status: CertificateStatus.ACTIVE,
        validTo: LessThan(targetDate),
      },
    });
  }

  async updateExpiringStatus(): Promise<number> {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const result = await this.certificatesRepository.update(
      {
        status: CertificateStatus.ACTIVE,
        validTo: LessThan(thirtyDaysFromNow),
      },
      { status: CertificateStatus.EXPIRING },
    );

    return result.affected || 0;
  }

  async updateExpiredStatus(): Promise<number> {
    const now = new Date();

    const result = await this.certificatesRepository.update(
      {
        status: CertificateStatus.ACTIVE,
        validTo: LessThan(now),
      },
      { status: CertificateStatus.EXPIRED },
    );

    return result.affected || 0;
  }
}
