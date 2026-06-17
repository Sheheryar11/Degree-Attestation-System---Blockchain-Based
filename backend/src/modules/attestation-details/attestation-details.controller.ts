import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { AttestationDetailsService } from './attestation-details.service';
import { UpsertAttestationDetailDto } from './dto/upsert-attestation-detail.dto';

@ApiTags('attestation-details')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications/:applicationId/attestation-detail')
export class AttestationDetailsController {
  constructor(private readonly service: AttestationDetailsService) {}

  @Get()
  @ApiOperation({ summary: 'Get attestation detail for an application' })
  findOne(@Param('applicationId') applicationId: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(applicationId, user.id, user.role as Role);
  }

  @Put()
  @ApiOperation({ summary: 'Create or update attestation detail (calculates fee automatically)' })
  upsert(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertAttestationDetailDto,
  ) {
    return this.service.upsert(applicationId, user.id, user.role as Role, dto);
  }
}
