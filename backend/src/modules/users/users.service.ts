import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, AuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const USER_SELECT = {
  id: true,
  email: true,
  role: true,
  isEmailVerified: true,
  isActive: true,
  createdAt: true,
  _count: { select: { applications: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async getStats() {
    const [totalUsers, totalApps, completedApps, blockchainConfirmed, totalRevenue, recentApps, statusGroups, pendingPayment, generatedCerts] = await Promise.all([
      this.prisma.user.count({ where: { role: 'STUDENT' } }),
      this.prisma.application.count(),
      this.prisma.application.count({ where: { status: 'COMPLETED' } }),
      this.prisma.blockchainRecord.count({ where: { status: 'CONFIRMED' } }),
      this.prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      this.prisma.application.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { student: { select: { email: true } }, degreeDetail: true },
      }),
      this.prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.application.count({ where: { status: 'PAYMENT_PENDING' } }),
      this.prisma.generatedCertificate.count(),
    ]);

    const byStatus: Record<string, number> = {};
    for (const g of statusGroups) {
      byStatus[g.status] = g._count._all;
    }

    return {
      totalStudents: totalUsers,
      totalApplications: totalApps,
      completedAttestations: completedApps,
      blockchainConfirmed,
      totalRevenue: totalRevenue._sum.amount ?? 0,
      pendingPayment,
      generatedCertificates: generatedCerts,
      byStatus,
      recentApplications: recentApps,
    };
  }

  async findAll(query: ListUsersDto) {
    const where = query.role ? { role: query.role } : {};
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, select: USER_SELECT, skip: query.skip, take: query.take, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, skip: query.skip, take: query.take };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { ...USER_SELECT, personalDetail: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, adminId: string, dto: UpdateUserDto, ip?: string, ua?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });

    const action = dto.isActive === false ? AuditAction.USER_DEACTIVATED : AuditAction.USER_ROLE_CHANGED;
    const meta: Prisma.InputJsonValue = JSON.parse(JSON.stringify({ targetUserId: id, changes: dto }));
    await this.auditLog.log(adminId, action, meta, ip, ua);
    return updated;
  }
}
