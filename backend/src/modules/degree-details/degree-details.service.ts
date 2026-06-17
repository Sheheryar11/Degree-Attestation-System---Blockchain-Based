import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertDegreeDetailDto } from './dto/upsert-degree-detail.dto';
import { Role } from '@prisma/client';

@Injectable()
export class DegreeDetailsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAccess(applicationId: string, userId: string, role: Role) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('Application not found');
    if (role === Role.STUDENT && app.studentId !== userId) throw new ForbiddenException('Access denied');
    return app;
  }

  async upsert(applicationId: string, userId: string, role: Role, dto: UpsertDegreeDetailDto) {
    await this.assertAccess(applicationId, userId, role);
    return this.prisma.degreeDetail.upsert({
      where: { applicationId },
      create: { applicationId, ...dto },
      update: dto,
    });
  }

  async findOne(applicationId: string, userId: string, role: Role) {
    await this.assertAccess(applicationId, userId, role);
    return this.prisma.degreeDetail.findUnique({ where: { applicationId } });
  }
}
