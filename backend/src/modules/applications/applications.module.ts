import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [AuditLogModule, VouchersModule, BlockchainModule, EmailModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
