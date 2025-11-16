import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

interface CreateAuditLogDto {
  action: AuditAction;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  errorMessage?: string;
  success: boolean;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  async log(data: CreateAuditLogDto): Promise<AuditLog> {
    const log = this.auditRepository.create(data);
    return this.auditRepository.save(log);
  }

  async findAll(
    filters: {
      userId?: string;
      action?: AuditAction;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page = 1,
    limit = 50,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const where: FindOptionsWhere<AuditLog> = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.resourceType) where.resourceType = filters.resourceType;

    const queryBuilder = this.auditRepository.createQueryBuilder('log');

    Object.keys(where).forEach((key) => {
      queryBuilder.andWhere(`log.${key} = :${key}`, { [key]: where[key] });
    });

    if (filters.startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate: filters.endDate });
    }

    queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('log.createdAt', 'DESC');

    const [logs, total] = await queryBuilder.getManyAndCount();

    return { logs, total };
  }

  async findByResource(resourceType: string, resourceId: string): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { resourceType, resourceId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
