import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { DegreeDetailsService } from './degree-details.service';
import { UpsertDegreeDetailDto } from './dto/upsert-degree-detail.dto';

@ApiTags('degree-details')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications/:applicationId/degree-detail')
export class DegreeDetailsController {
  constructor(private readonly service: DegreeDetailsService) {}

  @Get()
  @ApiOperation({ summary: 'Get degree detail for an application' })
  findOne(@Param('applicationId') applicationId: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(applicationId, user.id, user.role as Role);
  }

  @Put()
  @ApiOperation({ summary: 'Create or update degree detail' })
  upsert(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertDegreeDetailDto,
  ) {
    return this.service.upsert(applicationId, user.id, user.role as Role, dto);
  }
}
