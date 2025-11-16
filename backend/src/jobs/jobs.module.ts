import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificateExpirationProcessor } from './certificate-expiration.processor';
import { CertificatesModule } from '../modules/certificates/certificates.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { User } from '../modules/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    BullModule.registerQueue({
      name: 'certificates',
    }),
    CertificatesModule,
    NotificationsModule,
  ],
  providers: [CertificateExpirationProcessor],
})
export class JobsModule {}

