import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AttestationType } from '@prisma/client';

export class CreateApplicationDto {
  @ApiPropertyOptional({ enum: AttestationType })
  @IsOptional()
  @IsEnum(AttestationType)
  attestationType?: AttestationType;
}
