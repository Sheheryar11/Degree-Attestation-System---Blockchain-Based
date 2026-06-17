import { Injectable } from '@nestjs/common';
import { Prisma, AuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  log(userId: string | null, action: AuditAction, metadata?: Prisma.InputJsonValue, ipAddress?: string, userAgent?: string) {
    return this.prisma.auditLog.create({
      data: { userId, action, metadata, ipAddress, userAgent },
    });
  }

  findAll(params: { userId?: string; action?: AuditAction; skip?: number; take?: number }) {
    const { userId, action, skip = 0, take = 50 } = params;
    return this.prisma.auditLog.findMany({
      where: { userId, action },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }
}
