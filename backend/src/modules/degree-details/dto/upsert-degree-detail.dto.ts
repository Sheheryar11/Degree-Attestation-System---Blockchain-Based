import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CertificateType } from '@prisma/client';

export class UpsertDegreeDetailDto {
  @ApiPropertyOptional() @IsOptional() @IsString() universityName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() degreeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() degreeProgram?: string;
  @ApiPropertyOptional({ enum: CertificateType }) @IsOptional() @IsEnum(CertificateType) degreeType?: CertificateType;
  @ApiPropertyOptional() @IsOptional() @IsString() rollNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() registrationNumber?: string;

  @ApiPropertyOptional({ minimum: 1950, maximum: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  graduationYear?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() cgpa?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() division?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() degreeSerialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() degreeIssuanceDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transcriptSerialNumber?: string;
}
