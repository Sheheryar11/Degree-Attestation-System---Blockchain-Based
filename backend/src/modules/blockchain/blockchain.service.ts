import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockchainStatus, ApplicationStatus } from '@prisma/client';
import { sha256 } from '../../common/utils/hash.util';
import { randomBytes } from 'crypto';
import * as ABI from './DegreeAttestation.json';
import { CertificatesService } from '../certificates/certificates.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;
  private enabled = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => CertificatesService)) private readonly certificates: CertificatesService,
    private readonly email: EmailService,
  ) {}

  onModuleInit() {
    const rpcUrl = this.config.get<string>('AMOY_RPC_URL');
    const privateKey = this.config.get<string>('BACKEND_SIGNER_PRIVATE_KEY');
    const contractAddress = this.config.get<string>('CONTRACT_ADDRESS');

    if (!privateKey || privateKey === '0xchangeme' || !contractAddress || contractAddress === '0xchangeme') {
      this.logger.warn('Blockchain credentials not configured — blockchain registration disabled');
      return;
    }

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.signer = new ethers.Wallet(privateKey, this.provider);
      this.contract = new ethers.Contract(contractAddress, ABI.abi, this.signer);
      this.enabled = true;
      this.logger.log(`Blockchain service connected — contract: ${contractAddress}`);
    } catch (err) {
      this.logger.error('Failed to initialize blockchain service', err);
    }
  }

  private generateDegreeId(): string {
    const year = new Date().getFullYear();
    const hex = randomBytes(3).toString('hex').toUpperCase();
    return `DAS-${year}-${hex}`;
  }

  private buildDegreeHash(applicationId: string, data: {
    studentEmail: string;
    universityName?: string | null;
    degreeName?: string | null;
    graduationYear?: number | null;
  }): string {
    const payload = JSON.stringify({
      applicationId,
      studentEmail: data.studentEmail,
      universityName: data.universityName ?? '',
      degreeName: data.degreeName ?? '',
      graduationYear: data.graduationYear ?? 0,
    });
    return sha256(payload);
  }

  // Called at submission time so the student can see their degree ID and hash immediately
  async preRegister(applicationId: string): Promise<void> {
    const existing = await this.prisma.blockchainRecord.findUnique({ where: { applicationId } });
    if (existing) return;

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { student: { select: { email: true } }, degreeDetail: true },
    });
    if (!application) return;

    await this.prisma.blockchainRecord.create({
      data: {
        applicationId,
        degreeId: this.generateDegreeId(),
        degreeHash: this.buildDegreeHash(applicationId, {
          studentEmail: application.student.email,
          universityName: application.degreeDetail?.universityName,
          degreeName: application.degreeDetail?.degreeName,
          graduationYear: application.degreeDetail?.graduationYear,
        }),
        status: BlockchainStatus.NOT_SUBMITTED,
        contractAddress: this.config.get<string>('CONTRACT_ADDRESS'),
      },
    });
  }

  async registerDegree(applicationId: string): Promise<void> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        student: { select: { email: true } },
        degreeDetail: true,
      },
    });

    if (!application) throw new Error(`Application ${applicationId} not found`);

    // Reuse pre-registered record if it exists, otherwise create one now
    const existing = await this.prisma.blockchainRecord.findUnique({ where: { applicationId } });

    let degreeId: string;
    let degreeHash: string;

    if (existing) {
      degreeId = existing.degreeId;
      degreeHash = existing.degreeHash ?? this.buildDegreeHash(applicationId, {
        studentEmail: application.student.email,
        universityName: application.degreeDetail?.universityName,
        degreeName: application.degreeDetail?.degreeName,
        graduationYear: application.degreeDetail?.graduationYear,
      });
    } else {
      degreeId = this.generateDegreeId();
      degreeHash = this.buildDegreeHash(applicationId, {
        studentEmail: application.student.email,
        universityName: application.degreeDetail?.universityName,
        degreeName: application.degreeDetail?.degreeName,
        graduationYear: application.degreeDetail?.graduationYear,
      });
      await this.prisma.blockchainRecord.create({
        data: {
          applicationId,
          degreeId,
          degreeHash,
          status: BlockchainStatus.NOT_SUBMITTED,
          contractAddress: this.config.get<string>('CONTRACT_ADDRESS'),
        },
      });
    }

    if (!this.enabled) {
      this.logger.warn(`Blockchain disabled — marking ${applicationId} as COMPLETED without on-chain registration`);
      await this.prisma.$transaction([
        this.prisma.blockchainRecord.update({
          where: { applicationId },
          data: { status: BlockchainStatus.CONFIRMED, registeredAt: new Date() },
        }),
        this.prisma.application.update({
          where: { id: applicationId },
          data: { status: ApplicationStatus.COMPLETED },
        }),
      ]);
      this.onCompleted(applicationId, degreeId, null).catch(() => {});
      return;
    }

    try {
      await this.prisma.blockchainRecord.update({
        where: { applicationId },
        data: { status: BlockchainStatus.PENDING },
      });

      this.logger.log(`Submitting degree ${degreeId} to blockchain...`);
      const tx = await this.contract!.registerDegree(
        degreeId,
        degreeHash,
        application.degreeDetail?.universityName ?? '',
        application.degreeDetail?.degreeName ?? '',
        String(application.degreeDetail?.graduationYear ?? ''),
        applicationId,
      );
      this.logger.log(`Transaction submitted: ${tx.hash}`);

      await this.prisma.blockchainRecord.update({
        where: { applicationId },
        data: { txHash: tx.hash, status: BlockchainStatus.PENDING },
      });

      const receipt = await tx.wait(1);
      this.logger.log(`Transaction confirmed in block ${receipt.blockNumber}`);

      await this.prisma.$transaction([
        this.prisma.blockchainRecord.update({
          where: { applicationId },
          data: { status: BlockchainStatus.CONFIRMED, blockNumber: receipt.blockNumber, registeredAt: new Date() },
        }),
        this.prisma.application.update({
          where: { id: applicationId },
          data: { status: ApplicationStatus.COMPLETED },
        }),
      ]);
      this.onCompleted(applicationId, degreeId, tx.hash).catch(() => {});
    } catch (err) {
      this.logger.error(`Blockchain registration failed for ${applicationId}`, err);
      await this.prisma.blockchainRecord.update({
        where: { applicationId },
        data: { status: BlockchainStatus.FAILED },
      });
      await this.prisma.application.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.COMPLETED },
      });
      this.onCompleted(applicationId, degreeId, null).catch(() => {});
    }
  }

  private async onCompleted(applicationId: string, degreeId: string, txHash: string | null) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { trackingNumber: true, student: { select: { email: true } } },
    });
    if (!app) return;

    await this.certificates.generate(applicationId).catch((err) =>
      this.logger.error(`Certificate generation failed for ${applicationId}`, err),
    );

    await this.email.sendAttestationCompleted(app.student.email, app.trackingNumber, degreeId, txHash).catch(() => {});
  }

  async revokeDegree(applicationId: string, reason: string): Promise<void> {
    const record = await this.prisma.blockchainRecord.findUnique({ where: { applicationId } });
    if (!record) throw new Error('No blockchain record found');

    if (this.enabled && record.txHash) {
      try {
        const tx = await this.contract!.revokeDegree(record.degreeId);
        await tx.wait(1);
        this.logger.log(`Degree ${record.degreeId} revoked on-chain`);
      } catch (err) {
        this.logger.error('On-chain revocation failed', err);
      }
    }

    await this.prisma.blockchainRecord.update({
      where: { applicationId },
      data: { status: BlockchainStatus.REVOKED, revokedAt: new Date() },
    });
  }

  async getRecord(applicationId: string) {
    return this.prisma.blockchainRecord.findUnique({ where: { applicationId } });
  }

  async listAll() {
    return this.prisma.blockchainRecord.findMany({
      orderBy: { registeredAt: 'desc' },
      include: {
        application: {
          select: {
            trackingNumber: true,
            student: { select: { email: true } },
            degreeDetail: { select: { universityName: true, degreeName: true } },
          },
        },
      },
    });
  }
}
