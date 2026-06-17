import { Module } from '@nestjs/common';
import { DegreeDetailsController } from './degree-details.controller';
import { DegreeDetailsService } from './degree-details.service';

@Module({
  controllers: [DegreeDetailsController],
  providers: [DegreeDetailsService],
  exports: [DegreeDetailsService],
})
export class DegreeDetailsModule {}
