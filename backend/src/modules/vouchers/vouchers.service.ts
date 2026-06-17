import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction, ApplicationStatus, Role } from '@prisma/client';
import { randomBytes } from 'crypto';

function generateVoucherNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = randomBytes(3).toString('hex').toUpperCase();
  return `VCH-${y}${m}${d}-${rand}`;
}

@Injectable()
export class VouchersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async generate(applicationId: string, actorId: string, role: Role, ip?: string, ua?: string) {
    if (role === Role.STUDENT) {
      const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
      if (!app) throw new NotFoundException('Application not found');
      if (app.studentId !== actorId) throw new ForbiddenException('Access denied');
    }
    return this.autoGenerate(applicationId, actorId, ip, ua);
  }

  async autoGenerate(applicationId: string, actorId: string, ip?: string, ua?: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { attestationDetail: true },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (!app.totalFee) throw new BadRequestException('Application fee has not been calculated');

    const existing = await this.prisma.voucher.findUnique({ where: { applicationId } });
    if (existing) return existing;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const voucher = await this.prisma.voucher.create({
      data: {
        applicationId,
        voucherNumber: generateVoucherNumber(),
        amount: app.totalFee,
        expiresAt,
      },
    });

    await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.PAYMENT_PENDING },
    });

    await this.auditLog.log(actorId, AuditAction.VOUCHER_GENERATED, JSON.parse(JSON.stringify({ applicationId, voucherId: voucher.id })), ip, ua);
    return voucher;
  }

  async findByApplication(applicationId: string) {
    return this.prisma.voucher.findUnique({
      where: { applicationId },
      include: { payments: true },
    });
  }
}
