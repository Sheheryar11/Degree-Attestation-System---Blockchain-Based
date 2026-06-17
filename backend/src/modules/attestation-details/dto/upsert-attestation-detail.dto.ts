import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AttestationType, DeliveryMethod, Priority } from '@prisma/client';

export class UpsertAttestationDetailDto {
  @ApiPropertyOptional({ enum: AttestationType })
  @IsOptional()
  @IsEnum(AttestationType)
  attestationType?: AttestationType;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ enum: DeliveryMethod })
  @IsOptional()
  @IsEnum(DeliveryMethod)
  deliveryMethod?: DeliveryMethod;

  @ApiPropertyOptional({ description: 'Number of attested copies requested', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numberOfCopies?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() destinationCountry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purposeOfAttestation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryAddress?: string;
}
