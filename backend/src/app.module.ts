import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validate } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { PersonalDetailsModule } from './modules/personal-details/personal-details.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { DegreeDetailsModule } from './modules/degree-details/degree-details.module';
import { AttestationDetailsModule } from './modules/attestation-details/attestation-details.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { VerificationModule } from './modules/verification/verification.module';
import { UsersModule } from './modules/users/users.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { EmailModule } from './modules/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuditLogModule,
    AuthModule,
    PersonalDetailsModule,
    ApplicationsModule,
    DegreeDetailsModule,
    AttestationDetailsModule,
    DocumentsModule,
    VouchersModule,
    PaymentsModule,
    VerificationModule,
    UsersModule,
    BlockchainModule,
    CertificatesModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
