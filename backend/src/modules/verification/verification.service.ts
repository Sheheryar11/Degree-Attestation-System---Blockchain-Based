import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { sha256 } from '../../common/utils/hash.util';
import { decrypt } from '../../common/utils/crypto.util';

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  private async logRequest(degreeIdQueried: string, queryMethod: string, found: boolean, verifierIp?: string, result?: object) {
    return this.prisma.verificationRequest.create({
      data: { degreeIdQueried, queryMethod, found, verifierIp, result },
    });
  }

  async verifyByDegreeId(degreeId: string, verifierIp?: string) {
    const record = await this.prisma.blockchainRecord.findUnique({
      where: { degreeId },
      include: {
        application: {
          include: {
            degreeDetail: true,
            student: { select: { email: true } },
          },
        },
        certificate: { select: { type: true, sha256Hash: true, generatedAt: true } },
      },
    });

    const found = !!record;
    const result = found ? {
      degreeId,
      status: record!.status,
      university: record!.application.degreeDetail?.universityName,
      degree: record!.application.degreeDetail?.degreeName,
      graduationYear: record!.application.degreeDetail?.graduationYear,
      registeredAt: record!.registeredAt,
      txHash: record!.txHash,
    } : null;

    await this.logRequest(degreeId, 'degree_id', found, verifierIp, result ?? undefined);
    if (!found) throw new NotFoundException('No degree found with this ID');
    return result;
  }

  async verifyByCnic(cnic: string, verifierIp?: string) {
    // Hash the CNIC for privacy-preserving lookup (we never store CNIC plaintext in verification logs)
    const cnicHash = sha256(cnic);

    const records = await this.prisma.blockchainRecord.findMany({
      where: { application: { student: { personalDetail: { cnic: { not: null } } } } },
      include: {
        application: {
          include: {
            student: { include: { personalDetail: true } },
            degreeDetail: true,
          },
        },
        certificate: { select: { type: true, sha256Hash: true, generatedAt: true } },
      },
    });

    const matched = records.filter((r) => {
      const encCnic = r.application.student.personalDetail?.cnic;
      if (!encCnic) return false;
      try {
        return decrypt(encCnic) === cnic;
      } catch {
        return false;
      }
    });

    const found = matched.length > 0;
    await this.logRequest(cnicHash, 'cnic', found, verifierIp);
    if (!found) throw new NotFoundException('No attested degrees found for this CNIC');

    return matched.map((r) => ({
      degreeId: r.degreeId,
      status: r.status,
      university: r.application.degreeDetail?.universityName,
      degree: r.application.degreeDetail?.degreeName,
      graduationYear: r.application.degreeDetail?.graduationYear,
      registeredAt: r.registeredAt,
      txHash: r.txHash,
    }));
  }

  async verifyByQr(qrToken: string, verifierIp?: string) {
    const record = await this.prisma.blockchainRecord.findFirst({
      where: { degreeId: qrToken },
      include: {
        application: { include: { degreeDetail: true } },
        certificate: { select: { type: true, sha256Hash: true, qrCodeUrl: true, generatedAt: true } },
      },
    });

    const found = !!record;
    await this.logRequest(qrToken, 'qr', found, verifierIp);
    if (!found) throw new NotFoundException('Invalid or expired QR code');

    return {
      degreeId: record!.degreeId,
      status: record!.status,
      university: record!.application.degreeDetail?.universityName,
      degree: record!.application.degreeDetail?.degreeName,
      graduationYear: record!.application.degreeDetail?.graduationYear,
      registeredAt: record!.registeredAt,
      txHash: record!.txHash,
    };
  }
}
