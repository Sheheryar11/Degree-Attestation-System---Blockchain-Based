import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { IsString } from 'class-validator';
import { VerificationService } from './verification.service';

class VerifyByDegreeIdDto { @IsString() degreeId: string; }
class VerifyByCnicDto    { @IsString() cnic: string; }
class VerifyByQrDto      { @IsString() token: string; }

@ApiTags('verification')
@Controller('verify')
export class VerificationController {
  constructor(private readonly service: VerificationService) {}

  @Get('degree')
  @ApiOperation({ summary: 'Verify a degree by HEC degree ID (public)' })
  @ApiQuery({ name: 'degreeId', required: true })
  verifyByDegreeId(@Query() q: VerifyByDegreeIdDto, @Req() req: Request) {
    return this.service.verifyByDegreeId(q.degreeId, req.ip);
  }

  @Get('cnic')
  @ApiOperation({ summary: 'Verify degrees by CNIC (public)' })
  @ApiQuery({ name: 'cnic', required: true })
  verifyByCnic(@Query() q: VerifyByCnicDto, @Req() req: Request) {
    return this.service.verifyByCnic(q.cnic, req.ip);
  }

  @Get('qr')
  @ApiOperation({ summary: 'Verify a degree by QR token (public)' })
  @ApiQuery({ name: 'token', required: true })
  verifyByQr(@Query() q: VerifyByQrDto, @Req() req: Request) {
    return this.service.verifyByQr(q.token, req.ip);
  }
}
