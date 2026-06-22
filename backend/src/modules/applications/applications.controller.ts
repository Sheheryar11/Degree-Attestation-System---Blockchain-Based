import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ListApplicationsDto } from './dto/list-applications.dto';
import { IsIn, IsOptional, IsString } from 'class-validator';

class AdminRejectDto {
  @IsString()
  reason: string;
}

class OfficerReviewDto {
  @IsIn(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

@ApiTags('applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}

  @Post()
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Create a new application (STUDENT)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateApplicationDto, @Req() req: Request) {
    return this.service.create(user.id, dto, req.ip, req.headers['user-agent']);
  }

  @Get('me')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'List my applications (STUDENT)' })
  listMine(@CurrentUser() user: AuthUser, @Query() query: ListApplicationsDto) {
    return this.service.findAllForStudent(user.id, query);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all applications (ADMIN)' })
  listAll(@Query() query: ListApplicationsDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.id, user.role as Role);
  }

  @Patch(':id/submit')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Submit application — auto-generates voucher (STUDENT)' })
  submit(@Param('id') id: string, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.service.submit(id, user.id, req.ip, req.headers['user-agent']);
  }

  @Patch(':id/officer-review')
  @Roles(Role.OFFICER)
  @ApiOperation({ summary: 'Officer approves or rejects an application (OFFICER)' })
  officerReview(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: OfficerReviewDto,
    @Req() req: Request,
  ) {
    return this.service.officerReview(id, user.id, dto.decision, dto.rejectionReason, req.ip, req.headers['user-agent']);
  }

  @Patch(':id/registrar-review')
  @Roles(Role.REGISTRAR)
  @ApiOperation({ summary: 'Registrar approves or rejects an application (REGISTRAR)' })
  registrarReview(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: OfficerReviewDto,
    @Req() req: Request,
  ) {
    return this.service.registrarReview(id, user.id, dto.decision, dto.rejectionReason, req.ip, req.headers['user-agent']);
  }

  @Patch(':id/complete')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin completes an application — verifies payment and triggers blockchain (ADMIN)' })
  adminComplete(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.adminComplete(id, user.id, req.ip, req.headers['user-agent']);
  }

  @Patch(':id/reject')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin rejects an application (ADMIN)' })
  adminReject(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AdminRejectDto,
    @Req() req: Request,
  ) {
    return this.service.adminReject(id, user.id, dto.reason, req.ip, req.headers['user-agent']);
  }
}
