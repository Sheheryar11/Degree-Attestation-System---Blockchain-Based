import { Module } from '@nestjs/common';
import { AttestationDetailsController } from './attestation-details.controller';
import { AttestationDetailsService } from './attestation-details.service';

@Module({
  controllers: [AttestationDetailsController],
  providers: [AttestationDetailsService],
  exports: [AttestationDetailsService],
})
export class AttestationDetailsModule {}
