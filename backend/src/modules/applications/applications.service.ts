import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { EmailService } from '../email/email.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ListApplicationsDto } from './dto/list-applications.dto';
import { ApplicationStatus, AuditAction, AttestationType, Role } from '@prisma/client';
import { randomBytes } from 'crypto';

function generateTrackingNumber(): string {
  const year = new Date().getFullYear();
  const random = randomBytes(3).toString('hex').toUpperCase();
  return `HEC-${year}-${random}`;
}

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly vouchers: VouchersService,
    private readonly blockchain: BlockchainService,
    private readonly email: EmailService,
  ) {}

  async create(userId: string, dto: CreateApplicationDto, ip?: string, ua?: string) {
    const app = await this.prisma.application.create({
      data: {
        studentId: userId,
        trackingNumber: generateTrackingNumber(),
        attestationType: dto.attestationType ?? AttestationType.DOMESTIC,
        status: ApplicationStatus.DRAFT,
      },
    });
    await this.auditLog.log(userId, AuditAction.APPLICATION_CREATED, { applicationId: app.id }, ip, ua);
    return app;
  }

  async findAllForStudent(userId: string, query: ListApplicationsDto) {
    const where = { studentId: userId, ...(query.status ? { status: query.status } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: { degreeDetail: true, attestationDetail: true, voucher: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 }, blockchainRecord: true },
      }),
      this.prisma.application.count({ where }),
    ]);

    // Lazily pre-register blockchain hash for any submitted app that doesn't have one yet
    for (const app of data) {
      if (['PAYMENT_PENDING', 'PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED'].includes(app.status) && !app.blockchainRecord) {
        this.blockchain.preRegister(app.id).catch(() => {});
      }
    }

    return { data, total, skip: query.skip, take: query.take };
  }

  async findAll(query: ListApplicationsDto) {
    const where = query.status ? { status: query.status } : {};
    const [data, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { id: true, email: true } },
          degreeDetail: true,
          attestationDetail: true,
        },
      }),
      this.prisma.application.count({ where }),
    ]);
    return { data, total, skip: query.skip, take: query.take };
  }

  async findOne(id: string, requesterId: string, requesterRole: Role) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, email: true } },
        degreeDetail: true,
        attestationDetail: true,
        documents: true,
        payments: true,
        blockchainRecord: true,
        generatedCertificates: true,
        voucher: true,
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (requesterRole === Role.STUDENT && app.studentId !== requesterId) {
      throw new ForbiddenException('Access denied');
    }
    return app;
  }

  async submit(id: string, userId: string, ip?: string, ua?: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { degreeDetail: true, attestationDetail: true, documents: true, student: { select: { email: true } } },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.studentId !== userId) throw new ForbiddenException('Access denied');
    if (app.status !== ApplicationStatus.DRAFT && app.status !== ApplicationStatus.RETURNED) {
      throw new BadRequestException(`Cannot submit an application with status ${app.status}`);
    }
    if (!app.degreeDetail) throw new BadRequestException('Degree details are required before submission');
    if (!app.attestationDetail) throw new BadRequestException('Attestation details are required before submission');
    if (!app.totalFee) throw new BadRequestException('Attestation details fee must be saved before submission');

    await this.prisma.application.update({
      where: { id },
      data: { status: ApplicationStatus.SUBMITTED, submittedAt: new Date() },
    });

    // Auto-generate voucher immediately — no officer/registrar step needed
    await this.vouchers.autoGenerate(id, userId, ip, ua);

    // Pre-generate degree ID and hash so student can see them right away
    this.blockchain.preRegister(id).catch((err) => console.error('Blockchain pre-register failed:', err));

    await this.auditLog.log(userId, AuditAction.APPLICATION_SUBMITTED, JSON.parse(JSON.stringify({ applicationId: id })), ip, ua);

    const result = await this.prisma.application.findUnique({ where: { id }, include: { voucher: true } });

    // Send confirmation email
    this.email.sendApplicationSubmitted(
      app.student?.email ?? '',
      app.trackingNumber,
      result?.voucher?.voucherNumber ?? '',
      result?.voucher?.amount ?? app.totalFee ?? 0,
    ).catch(() => {});

    return result;
  }

  async adminComplete(id: string, adminId: string, ip?: string, ua?: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { payments: { where: { status: 'PENDING' }, take: 1 } },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (!['PAYMENT_SUBMITTED', 'PAYMENT_PENDING'].includes(app.status)) {
      throw new BadRequestException(`Cannot complete application with status ${app.status}`);
    }

    // Mark any pending payment as completed
    if (app.payments.length > 0) {
      await this.prisma.payment.update({
        where: { id: app.payments[0].id },
        data: { status: 'COMPLETED', verifiedAt: new Date() },
      });
    }

    await this.prisma.application.update({
      where: { id },
      data: { status: ApplicationStatus.PAYMENT_VERIFIED },
    });

    await this.auditLog.log(adminId, AuditAction.PAYMENT_VERIFIED, JSON.parse(JSON.stringify({ applicationId: id })), ip, ua);

    this.blockchain.registerDegree(id).catch((err) =>
      console.error(`Blockchain registration failed for ${id}:`, err),
    );

    return { success: true };
  }

  async adminReject(id: string, adminId: string, reason: string, ip?: string, ua?: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { student: { select: { email: true } } },
    });
    if (!app) throw new NotFoundException('Application not found');

    const updated = await this.prisma.application.update({
      where: { id },
      data: { status: ApplicationStatus.REJECTED, rejectionReason: reason },
    });

    await this.auditLog.log(adminId, AuditAction.APPLICATION_REJECTED, JSON.parse(JSON.stringify({ applicationId: id, reason })), ip, ua);

    this.email.sendApplicationRejected(app.student.email, app.trackingNumber, reason).catch(() => {});

    return updated;
  }
}
