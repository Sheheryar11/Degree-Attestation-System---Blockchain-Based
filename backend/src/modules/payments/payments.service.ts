import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { EmailService } from '../email/email.service';
import { SubmitPaymentDto } from './dto/submit-payment.dto';
import { AuditAction, ApplicationStatus, PaymentStatus, PaymentMethod, Role } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly blockchain: BlockchainService,
    private readonly email: EmailService,
  ) {}

  async submit(applicationId: string, userId: string, dto: SubmitPaymentDto, ip?: string, ua?: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { voucher: true, student: { select: { email: true } } },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.studentId !== userId) throw new ForbiddenException('Access denied');
    if (app.status !== ApplicationStatus.PAYMENT_PENDING) {
      throw new BadRequestException(`Cannot submit payment for application with status ${app.status}`);
    }
    if (!app.voucher) throw new BadRequestException('No voucher found for this application');

    // Auto-verify payment — no admin approval required
    const payment = await this.prisma.payment.create({
      data: {
        applicationId,
        voucherId: app.voucher.id,
        method: dto.method ?? PaymentMethod.BANK_CHALLAN,
        amount: dto.amount,
        transactionId: dto.transactionId,
        bankName: dto.bankName ?? null,
        paymentDate: new Date(dto.paymentDate),
        receiptUrl: dto.receiptUrl,
        status: PaymentStatus.COMPLETED,
        verifiedAt: new Date(),
      },
    });

    await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.PAYMENT_VERIFIED },
    });

    await this.auditLog.log(
      userId,
      AuditAction.PAYMENT_SUBMITTED,
      JSON.parse(JSON.stringify({ applicationId, paymentId: payment.id, autoVerified: true })),
      ip,
      ua,
    );

    // Send payment confirmation email
    this.email.sendPaymentReceived(app.student?.email ?? '', app.trackingNumber).catch(() => {});

    // Trigger blockchain registration immediately
    this.blockchain.registerDegree(applicationId).catch((err) => {
      console.error(`Blockchain registration failed for ${applicationId}:`, err);
    });

    return payment;
  }

  async findAllForApplication(applicationId: string) {
    return this.prisma.payment.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin can still view payments but no longer needs to approve them
  async findAll() {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { application: { select: { trackingNumber: true, student: { select: { email: true } } } } },
    });
  }

  // Kept for backward compatibility — admin can still manually verify if needed
  async adminVerify(paymentId: string, adminId: string, role: Role, approved: boolean, notes?: string, ip?: string, ua?: string) {
    if (role !== Role.ADMIN) throw new ForbiddenException('Access denied');

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { application: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment has already been processed');
    }

    const [updatedPayment] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: approved ? PaymentStatus.COMPLETED : PaymentStatus.FAILED, notes, verifiedAt: new Date() },
      }),
      this.prisma.application.update({
        where: { id: payment.applicationId },
        data: { status: approved ? ApplicationStatus.PAYMENT_VERIFIED : ApplicationStatus.PAYMENT_REJECTED },
      }),
    ]);

    if (approved) {
      this.blockchain.registerDegree(payment.applicationId).catch((err) => {
        console.error(`Blockchain registration failed for ${payment.applicationId}:`, err);
      });
    }

    await this.auditLog.log(
      adminId,
      approved ? AuditAction.PAYMENT_VERIFIED : AuditAction.PAYMENT_REJECTED,
      JSON.parse(JSON.stringify({ paymentId, applicationId: payment.applicationId })),
      ip,
      ua,
    );

    return updatedPayment;
  }
}
