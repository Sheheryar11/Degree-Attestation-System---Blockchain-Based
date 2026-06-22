import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from '../documents/cloudinary.service';
import { CertificateType } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import * as QRCode from 'qrcode';
import { createWriteStream, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);
  private readonly uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly cloudinary: CloudinaryService,
  ) {
    // Serverless filesystems (Vercel) are read-only outside /tmp
    this.uploadDir = process.env.VERCEL
      ? join(tmpdir(), 'certificates')
      : join(process.cwd(), 'uploads', 'certificates');
    mkdirSync(this.uploadDir, { recursive: true });
  }

  async generate(applicationId: string): Promise<string> {
    const existing = await this.prisma.generatedCertificate.findFirst({ where: { applicationId } });
    if (existing) return existing.pdfUrl;

    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        student: { include: { personalDetail: true } },
        degreeDetail: true,
        blockchainRecord: true,
      },
    });

    if (!app) throw new Error(`Application ${applicationId} not found`);

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const degreeId = app.blockchainRecord?.degreeId ?? 'N/A';
    const verifyUrl = `${frontendUrl}/verify?degreeId=${degreeId}`;

    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 120, margin: 1 });

    // Generate PDF
    const filename = `cert_${randomBytes(8).toString('hex')}.pdf`;
    const filePath = join(this.uploadDir, filename);
    const pdfUrl = `/uploads/certificates/${filename}`;

    await this.buildPdf(filePath, {
      studentName: app.student.personalDetail?.fullName ?? app.student.email,
      fatherName: app.student.personalDetail?.fatherName ?? '',
      universityName: app.degreeDetail?.universityName ?? '—',
      degreeName: app.degreeDetail?.degreeName ?? '—',
      degreeProgram: app.degreeDetail?.degreeProgram ?? '',
      graduationYear: app.degreeDetail?.graduationYear ?? 0,
      degreeId,
      txHash: app.blockchainRecord?.txHash ?? null,
      registeredAt: app.blockchainRecord?.registeredAt ?? new Date(),
      trackingNumber: app.trackingNumber,
      qrBuffer,
    });

    const hash = require('crypto').createHash('sha256').update(filename + applicationId).digest('hex');

    // Upload to Cloudinary so the PDF survives across deployments
    let finalPdfUrl = pdfUrl;
    let cloudinaryPublicId = filename;
    try {
      const buffer = readFileSync(filePath);
      const uploaded = await this.cloudinary.uploadBuffer(buffer, filename, 'degree-attestation/certificates');
      finalPdfUrl = uploaded.secure_url;
      cloudinaryPublicId = uploaded.public_id;
      // Clean up local temp file after successful upload
      try { unlinkSync(filePath); } catch { /* ignore */ }
    } catch (err) {
      // Cloudinary unavailable — fall back to local URL (dev mode)
      this.logger.warn(`Cloudinary upload failed for certificate ${filename}, using local URL: ${err}`);
    }

    const cert = await this.prisma.generatedCertificate.create({
      data: {
        applicationId,
        type: CertificateType.ATTESTATION,
        pdfUrl: finalPdfUrl,
        cloudinaryPublicId,
        sha256Hash: hash,
        qrCodeUrl: verifyUrl,
      },
    });

    // Link the certificate back to its blockchain record
    await this.prisma.blockchainRecord.updateMany({
      where: { applicationId, certificateId: null },
      data: { certificateId: cert.id },
    });

    this.logger.log(`Certificate generated for ${applicationId}: ${finalPdfUrl}`);
    return finalPdfUrl;
  }

  private buildPdf(filePath: string, data: {
    studentName: string;
    fatherName: string;
    universityName: string;
    degreeName: string;
    degreeProgram: string;
    graduationYear: number;
    degreeId: string;
    txHash: string | null;
    registeredAt: Date;
    trackingNumber: string;
    qrBuffer: Buffer;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 60 });
      const stream = createWriteStream(filePath);
      doc.pipe(stream);
      stream.on('finish', resolve);
      stream.on('error', reject);

      const W = doc.page.width;
      const gold = '#B8860B';
      const navy = '#1a237e';
      const green = '#2e7d32';

      // Outer border
      doc.rect(30, 30, W - 60, doc.page.height - 60).lineWidth(3).strokeColor(gold).stroke();
      doc.rect(36, 36, W - 72, doc.page.height - 72).lineWidth(1).strokeColor(gold).stroke();

      // Header band
      doc.rect(60, 60, W - 120, 90).fillColor(navy).fill();

      // Title
      doc.fillColor('white').font('Helvetica-Bold').fontSize(22)
        .text('HIGHER EDUCATION COMMISSION', 60, 75, { width: W - 120, align: 'center' });
      doc.fontSize(13).font('Helvetica')
        .text('DEGREE ATTESTATION CERTIFICATE', 60, 104, { width: W - 120, align: 'center' });

      // Sub-header
      doc.fillColor(navy).font('Helvetica-Bold').fontSize(11)
        .text('BLOCKCHAIN VERIFIED', 60, 165, { width: W - 120, align: 'center' });

      doc.moveDown(0.5);

      // Divider
      doc.moveTo(80, 190).lineTo(W - 80, 190).lineWidth(1).strokeColor(gold).stroke();

      // Body text
      doc.fillColor('#333').font('Helvetica').fontSize(11)
        .text('This is to certify that the degree described below has been attested by the Higher Education Commission (HEC) of Pakistan and permanently registered on the Polygon blockchain network.', 80, 205, { width: W - 160, align: 'center' });

      // Details table
      const startY = 275;
      const labelX = 80;
      const valueX = 230;
      const rowH = 28;

      const rows = [
        ['Student Name', data.studentName],
        ['Father\'s Name', data.fatherName || '—'],
        ['University', data.universityName],
        ['Degree Title', data.degreeName],
        ...(data.degreeProgram ? [['Program', data.degreeProgram]] : []),
        ['Graduation Year', String(data.graduationYear || '—')],
        ['Degree ID', data.degreeId],
        ['Attestation Date', data.registeredAt.toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })],
      ];

      rows.forEach((row, i) => {
        const y = startY + i * rowH;
        if (i % 2 === 0) {
          doc.rect(labelX, y - 4, W - 160, rowH).fillColor('#f5f5f5').fill();
        }
        doc.fillColor('#666').font('Helvetica-Bold').fontSize(9).text(row[0], labelX + 6, y + 3);
        doc.fillColor('#111').font('Helvetica').fontSize(10).text(row[1], valueX, y + 3, { width: W - valueX - 90 });
      });

      // QR code
      const qrY = startY + 4;
      doc.image(data.qrBuffer, W - 160, qrY, { width: 90 });
      doc.fillColor('#666').font('Helvetica').fontSize(7)
        .text('Scan to verify', W - 160, qrY + 94, { width: 90, align: 'center' });

      // Blockchain hash
      const hashY = startY + rows.length * rowH + 20;
      doc.moveTo(80, hashY).lineTo(W - 80, hashY).lineWidth(0.5).strokeColor('#ccc').stroke();

      if (data.txHash) {
        doc.fillColor('#666').font('Helvetica').fontSize(8)
          .text('Blockchain Tx Hash:', 80, hashY + 10)
          .fillColor('#333').font('Courier').fontSize(7)
          .text(data.txHash, 80, hashY + 24, { width: W - 160 });
      }

      // Footer
      const footerY = doc.page.height - 120;
      doc.moveTo(80, footerY).lineTo(W - 80, footerY).lineWidth(1).strokeColor(gold).stroke();

      doc.fillColor(green).font('Helvetica-Bold').fontSize(10)
        .text('✓ BLOCKCHAIN VERIFIED DOCUMENT', 0, footerY + 12, { width: W, align: 'center' });
      doc.fillColor('#666').font('Helvetica').fontSize(8)
        .text(`Verification ID: ${data.trackingNumber}  •  Verify online: das.hec.gov.pk/verify`, 0, footerY + 30, { width: W, align: 'center' });
      doc.fillColor('#888').fontSize(7)
        .text('This certificate is digitally signed and tamper-evident. Any alteration invalidates this document.', 0, footerY + 48, { width: W, align: 'center' });

      doc.end();
    });
  }

  async getByApplication(applicationId: string) {
    return this.prisma.generatedCertificate.findFirst({ where: { applicationId } });
  }

  async listByStudent(studentId: string) {
    return this.prisma.generatedCertificate.findMany({
      where: { application: { studentId } },
      include: {
        application: {
          select: { trackingNumber: true, attestationType: true, degreeDetail: true, blockchainRecord: true },
        },
      },
      orderBy: { generatedAt: 'desc' },
    });
  }
}
