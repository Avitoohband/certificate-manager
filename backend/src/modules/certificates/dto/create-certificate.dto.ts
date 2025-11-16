import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsEnum,
  IsObject,
} from 'class-validator';
import { CertificateType } from '../entities/certificate.entity';

export class CreateCertificateDto {
  @IsString()
  @MaxLength(255)
  commonName: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  organization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  organizationUnit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  locality?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjectAltNames?: string[];

  @IsEnum(CertificateType)
  type: CertificateType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650) // Max 10 years
  validityDays?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

