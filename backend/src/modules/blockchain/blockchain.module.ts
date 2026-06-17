import { Module, forwardRef } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { BlockchainController } from './blockchain.controller';
import { CertificatesModule } from '../certificates/certificates.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [forwardRef(() => CertificatesModule), EmailModule],
  controllers: [BlockchainController],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
