import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CloudinaryService } from './cloudinary.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { AuditAction, DocumentType, Role } from '@prisma/client';
import { sha256 } from '../../common/utils/hash.util';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const FOLDER_BY_TYPE: Partial<Record<DocumentType, string>> = {
  [DocumentType.DEGREE]:     'degree-attestation/degrees',
  [DocumentType.TRANSCRIPT]: 'degree-attestation/transcripts',
  [DocumentType.CNIC_FRONT]: 'degree-attestation/cnic',
  [DocumentType.CNIC_BACK]:  'degree-attestation/cnic',
  [DocumentType.PHOTO]:      'degree-attestation/photos',
  [DocumentType.BANK_RECEIPT]: 'degree-attestation/receipts',
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private async assertAccess(applicationId: string, userId: string, role: Role) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('Application not found');
    if (role === Role.STUDENT && app.studentId !== userId) throw new ForbiddenException('Access denied');
    return app;
  }

  async upload(
    applicationId: string,
    userId: string,
    role: Role,
    file: Express.Multer.File,
    dto: UploadDocumentDto,
    ip?: string,
    ua?: string,
  ) {
    await this.assertAccess(applicationId, userId, role);

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 10 MB limit');
    }

    const fileHash = sha256(file.buffer);
    const folder = FOLDER_BY_TYPE[dto.type] ?? 'degree-attestation/other';

    const uploadResult = await this.cloudinary.uploadBuffer(file.buffer, file.originalname, folder);

    const doc = await this.prisma.document.create({
      data: {
        applicationId,
        type: dto.type,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        cloudinaryUrl: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id,
        sha256Hash: fileHash,
      },
    });

    await this.auditLog.log(userId, AuditAction.DOCUMENT_UPLOADED, { documentId: doc.id, type: dto.type }, ip, ua);
    return doc;
  }

  async findAllForApplication(applicationId: string, userId: string, role: Role) {
    await this.assertAccess(applicationId, userId, role);
    return this.prisma.document.findMany({
      where: { applicationId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async delete(documentId: string, userId: string, role: Role, ip?: string, ua?: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { application: { select: { studentId: true } } },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (role === Role.STUDENT && doc.application.studentId !== userId) throw new ForbiddenException('Access denied');

    await this.cloudinary.deleteFile(doc.cloudinaryPublicId);
    await this.prisma.document.delete({ where: { id: documentId } });
    await this.auditLog.log(userId, AuditAction.DOCUMENT_DELETED, { documentId }, ip, ua);
    return { deleted: true };
  }
}
