import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendExpirationWarning(
    email: string,
    certificateCommonName: string,
    expirationDate: Date,
    daysLeft: number,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_FROM'),
        to: email,
        subject: `Certificate Expiration Warning: ${certificateCommonName}`,
        html: `
          <h2>Certificate Expiration Warning</h2>
          <p>Your certificate <strong>${certificateCommonName}</strong> will expire in <strong>${daysLeft} days</strong>.</p>
          <p><strong>Expiration Date:</strong> ${expirationDate.toLocaleDateString()}</p>
          <p>Please renew your certificate before it expires to avoid service interruption.</p>
          <p>Log in to the Certificate Manager to renew your certificate.</p>
        `,
      });

      this.logger.log(`Expiration warning sent to ${email} for certificate ${certificateCommonName}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}:`, error);
    }
  }

  async sendCertificateCreated(
    email: string,
    certificateCommonName: string,
    expirationDate: Date,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_FROM'),
        to: email,
        subject: `Certificate Created: ${certificateCommonName}`,
        html: `
          <h2>New Certificate Created</h2>
          <p>Your certificate <strong>${certificateCommonName}</strong> has been successfully created.</p>
          <p><strong>Expiration Date:</strong> ${expirationDate.toLocaleDateString()}</p>
          <p>You can download your certificate from the Certificate Manager.</p>
        `,
      });

      this.logger.log(`Certificate created notification sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}:`, error);
    }
  }
}

