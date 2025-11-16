import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { CertificatesService } from '../modules/certificates/certificates.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';

@Processor('certificates')
export class CertificateExpirationProcessor {
  private readonly logger = new Logger(CertificateExpirationProcessor.name);

  constructor(
    private certificatesService: CertificatesService,
    private notificationsService: NotificationsService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Check for expiring certificates and send notifications
   * Runs daily at midnight (scheduled by cron in module)
   */
  @Process('check-expiration')
  async handleExpirationCheck(job: Job) {
    this.logger.log('Starting certificate expiration check...');

    try {
      // Update certificate statuses
      const expiringCount = await this.certificatesService.updateExpiringStatus();
      const expiredCount = await this.certificatesService.updateExpiredStatus();

      this.logger.log(
        `Updated ${expiringCount} certificates to EXPIRING status, ${expiredCount} to EXPIRED`,
      );

      // Find certificates expiring in 30 days
      const expiringSoon = await this.certificatesService.findExpiring(30);

      this.logger.log(`Found ${expiringSoon.length} certificates expiring within 30 days`);

      // Send notifications
      for (const cert of expiringSoon) {
        const user = await this.usersRepository.findOne({ where: { id: cert.ownerId } });
        if (user && user.email) {
          const daysLeft = Math.ceil(
            (cert.validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          );

          await this.notificationsService.sendExpirationWarning(
            user.email,
            cert.commonName,
            cert.validTo,
            daysLeft,
          );
        }
      }

      this.logger.log('Certificate expiration check completed successfully');

      return {
        success: true,
        expiringCount,
        expiredCount,
        notificationsSent: expiringSoon.length,
      };
    } catch (error) {
      this.logger.error('Certificate expiration check failed:', error);
      throw error;
    }
  }
}

