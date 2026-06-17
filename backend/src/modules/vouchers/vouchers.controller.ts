import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { VouchersService } from './vouchers.service';

@ApiTags('vouchers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('applications/:applicationId/voucher')
export class VouchersController {
  constructor(private readonly service: VouchersService) {}

  @Get()
  @ApiOperation({ summary: 'Get voucher for an application' })
  findOne(@Param('applicationId') applicationId: string) {
    return this.service.findByApplication(applicationId);
  }

  @Post('generate')
  @Roles(Role.STUDENT, Role.ADMIN)
  @ApiOperation({ summary: 'Generate payment voucher (STUDENT for own app, ADMIN)' })
  generate(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.generate(applicationId, user.id, user.role as Role, req.ip, req.headers['user-agent']);
  }
}
