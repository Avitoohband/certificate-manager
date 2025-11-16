import { IsOptional, IsObject } from 'class-validator';

export class UpdateCertificateDto {
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

