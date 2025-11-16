import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CertificatesService } from './certificates.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { RevokeCertificateDto } from './dto/revoke-certificate.dto';
import { CertificateStatus } from './entities/certificate.entity';

@Controller('certificates')
@UseGuards(AuthGuard('jwt'))
export class CertificatesController {
  constructor(private certificatesService: CertificatesService) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() createDto: CreateCertificateDto) {
    return this.certificatesService.create(user.id, createDto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('status') status?: CertificateStatus,
  ) {
    return this.certificatesService.findAll(user.id, user.role, page, limit, status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.certificatesService.findOne(id, user.id, user.role);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateDto: UpdateCertificateDto,
  ) {
    return this.certificatesService.update(id, user.id, user.role, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async revoke(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() revokeDto: RevokeCertificateDto,
  ) {
    return this.certificatesService.revoke(id, user.id, user.role, revokeDto.reason);
  }

  @Post(':id/renew')
  async renew(@Param('id') id: string, @CurrentUser() user: User) {
    return this.certificatesService.renew(id, user.id, user.role);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @CurrentUser() user: User) {
    const cert = await this.certificatesService.findOne(id, user.id, user.role);
    return {
      certificate: cert.certificate,
      serialNumber: cert.serialNumber,
    };
  }

  @Get(':id/private-key')
  async getPrivateKey(@Param('id') id: string, @CurrentUser() user: User) {
    const privateKey = await this.certificatesService.getPrivateKey(id, user.id, user.role);
    return { privateKey };
  }
}
