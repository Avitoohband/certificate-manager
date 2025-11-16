import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { Certificate } from './entities/certificate.entity';
import { CryptoService } from '../../common/services/crypto.service';
import { CertificateCryptoService } from '../../common/services/certificate-crypto.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate]),
    BullModule.registerQueue({
      name: 'certificates',
    }),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [CertificatesController],
  providers: [CertificatesService, CryptoService, CertificateCryptoService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
