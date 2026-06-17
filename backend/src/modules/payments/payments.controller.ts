import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { SubmitPaymentDto } from './dto/submit-payment.dto';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('applications/:applicationId/payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'List payments for an application' })
  findAll(@Param('applicationId') applicationId: string) {
    return this.service.findAllForApplication(applicationId);
  }

  @Post()
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Submit payment proof — auto-verified, triggers blockchain registration' })
  submit(
    @Param('applicationId') applicationId: string,
    @Body() dto: SubmitPaymentDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.submit(applicationId, user.id, dto, req.ip, req.headers['user-agent']);
  }

  @Patch(':paymentId/verify')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Manually verify a payment (ADMIN only — for edge cases)' })
  adminVerify(
    @Param('paymentId') paymentId: string,
    @Body() body: { approved: boolean; notes?: string },
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.adminVerify(paymentId, user.id, user.role as Role, body.approved, body.notes, req.ip, req.headers['user-agent']);
  }
}
