import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertPersonalDetailDto } from './dto/upsert-personal-detail.dto';
import { encrypt, decrypt } from '../../common/utils/crypto.util';

@Injectable()
export class PersonalDetailsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, dto: UpsertPersonalDetailDto) {
    const data: Record<string, unknown> = { ...dto };

    // Encrypt CNIC before storing
    if (dto.cnic) {
      data.cnic = encrypt(dto.cnic);
    }

    // Convert date string "YYYY-MM-DD" to full ISO DateTime for Prisma
    if (dto.dateOfBirth) {
      data.dateOfBirth = new Date(dto.dateOfBirth).toISOString();
    }

    return this.prisma.personalDetail.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async findByUser(userId: string) {
    const detail = await this.prisma.personalDetail.findUnique({ where: { userId } });
    if (!detail) return null;

    // Decrypt CNIC for the owning user
    return {
      ...detail,
      cnic: detail.cnic ? decrypt(detail.cnic) : null,
      dateOfBirth: detail.dateOfBirth ? detail.dateOfBirth.toISOString().split('T')[0] : null,
    };
  }
}
