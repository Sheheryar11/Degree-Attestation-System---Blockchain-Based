import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { CertificatesService } from './certificates.service';

@ApiTags('certificates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly service: CertificatesService) {}

  @Get('mine')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get all certificates for the logged-in student' })
  listMine(@CurrentUser() user: AuthUser) {
    return this.service.listByStudent(user.id);
  }

  @Get('application/:applicationId')
  @Roles(Role.STUDENT, Role.ADMIN)
  @ApiOperation({ summary: 'Get certificate for a specific application' })
  getByApplication(@Param('applicationId') applicationId: string) {
    return this.service.getByApplication(applicationId);
  }
}
