import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentVerifyStatus {
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export class VerifyPaymentDto {
  @ApiProperty({ enum: PaymentVerifyStatus })
  @IsEnum(PaymentVerifyStatus)
  status: PaymentVerifyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
