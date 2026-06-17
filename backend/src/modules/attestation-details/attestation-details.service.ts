import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertAttestationDetailDto } from './dto/upsert-attestation-detail.dto';
import { AttestationType, DeliveryMethod, Priority, Role } from '@prisma/client';

// Fee table: base fees in PKR
const BASE_FEES: Record<AttestationType, number> = {
  [AttestationType.DOMESTIC]: 3000,
  [AttestationType.INTERNATIONAL]: 8000,
  [AttestationType.DUPLICATE]: 5000,
  [AttestationType.TRANSCRIPT]: 2500,
  [AttestationType.MIGRATION]: 4000,
};

const PRIORITY_SURCHARGE: Record<Priority, number> = {
  [Priority.NORMAL]: 0,
  [Priority.URGENT]: 2000,
  [Priority.EXPRESS]: 5000,
};

const DELIVERY_FEE: Record<DeliveryMethod, number> = {
  [DeliveryMethod.SELF_PICKUP]: 0,
  [DeliveryMethod.COURIER_DOMESTIC]: 500,
  [DeliveryMethod.COURIER_INTERNATIONAL]: 3000,
};

function calculateFee(dto: UpsertAttestationDetailDto): number {
  const base = BASE_FEES[dto.attestationType ?? AttestationType.DOMESTIC];
  const copies = dto.numberOfCopies ?? 1;
  const prioritySurcharge = PRIORITY_SURCHARGE[dto.priority ?? Priority.NORMAL];
  const deliveryFee = DELIVERY_FEE[dto.deliveryMethod ?? DeliveryMethod.SELF_PICKUP];
  return base * copies + prioritySurcharge + deliveryFee;
}

@Injectable()
export class AttestationDetailsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAccess(applicationId: string, userId: string, role: Role) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('Application not found');
    if (role === Role.STUDENT && app.studentId !== userId) throw new ForbiddenException('Access denied');
    return app;
  }

  async upsert(applicationId: string, userId: string, role: Role, dto: UpsertAttestationDetailDto) {
    await this.assertAccess(applicationId, userId, role);
    const totalFee = calculateFee(dto);

    const detail = await this.prisma.attestationDetail.upsert({
      where: { applicationId },
      create: { applicationId, ...dto },
      update: dto,
    });

    // Update calculated fee on the application
    await this.prisma.application.update({
      where: { id: applicationId },
      data: { totalFee, attestationType: dto.attestationType },
    });

    return { ...detail, calculatedFee: totalFee };
  }

  async findOne(applicationId: string, userId: string, role: Role) {
    await this.assertAccess(applicationId, userId, role);
    const detail = await this.prisma.attestationDetail.findUnique({ where: { applicationId } });
    if (!detail) return null;
    const partial: UpsertAttestationDetailDto = {
      attestationType: detail.attestationType ?? undefined,
      priority: detail.priority ?? undefined,
      deliveryMethod: detail.deliveryMethod ?? undefined,
      numberOfCopies: detail.numberOfCopies ?? undefined,
    };
    return { ...detail, calculatedFee: calculateFee(partial) };
  }
}
