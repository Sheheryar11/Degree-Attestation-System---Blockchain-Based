# NestJS Backend — Folder Structure, REST API & DTOs

## 1. Folder Structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts
│   │   │   └── current-user.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── audit-log.interceptor.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   └── utils/
│   │       ├── hash.util.ts        // SHA-256
│   │       └── crypto.util.ts      // AES encrypt/decrypt CNIC
│   ├── config/
│   │   ├── configuration.ts
│   │   └── env.validation.ts
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── jwt-refresh.strategy.ts
│   │   │   └── dto/
│   │   │       ├── register.dto.ts
│   │   │       ├── login.dto.ts
│   │   │       ├── verify-email.dto.ts
│   │   │       └── reset-password.dto.ts
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── dto/
│   │   ├── personal-details/
│   │   │   ├── personal-details.module.ts
│   │   │   ├── personal-details.controller.ts
│   │   │   ├── personal-details.service.ts
│   │   │   └── dto/create-personal-detail.dto.ts
│   │   ├── applications/
│   │   │   ├── applications.module.ts
│   │   │   ├── applications.controller.ts
│   │   │   ├── applications.service.ts
│   │   │   └── dto/
│   │   ├── degree-details/
│   │   │   └── ... (module, controller, service, dto)
│   │   ├── attestation/
│   │   │   ├── attestation.module.ts
│   │   │   ├── attestation.controller.ts
│   │   │   ├── attestation.service.ts
│   │   │   ├── fee-calculator.ts
│   │   │   └── dto/create-attestation.dto.ts
│   │   ├── documents/
│   │   │   ├── documents.module.ts
│   │   │   ├── documents.controller.ts
│   │   │   ├── documents.service.ts
│   │   │   ├── cloudinary.provider.ts
│   │   │   └── dto/upload-document.dto.ts
│   │   ├── ocr/
│   │   │   ├── ocr.module.ts
│   │   │   ├── ocr.service.ts
│   │   │   ├── vision.provider.ts
│   │   │   └── parsers/
│   │   │       ├── cnic.parser.ts
│   │   │       ├── degree.parser.ts
│   │   │       └── transcript.parser.ts
│   │   ├── validation/
│   │   │   ├── validation.module.ts
│   │   │   ├── validation.service.ts
│   │   │   └── strategies/
│   │   │       ├── name-match.strategy.ts
│   │   │       └── cnic-match.strategy.ts
│   │   ├── vouchers/
│   │   │   ├── vouchers.module.ts
│   │   │   ├── vouchers.controller.ts
│   │   │   ├── vouchers.service.ts
│   │   │   └── templates/voucher.template.ts
│   │   ├── payments/
│   │   │   ├── payments.module.ts
│   │   │   ├── payments.controller.ts
│   │   │   ├── payments.service.ts
│   │   │   └── dto/
│   │   ├── certificates/
│   │   │   ├── certificates.module.ts
│   │   │   ├── certificates.controller.ts
│   │   │   ├── certificates.service.ts
│   │   │   ├── pdf/
│   │   │   │   ├── puppeteer.provider.ts
│   │   │   │   └── templates/
│   │   │   │       ├── degree.template.ts
│   │   │   │       ├── transcript.template.ts
│   │   │   │       └── attestation.template.ts
│   │   ├── blockchain/
│   │   │   ├── blockchain.module.ts
│   │   │   ├── blockchain.controller.ts
│   │   │   ├── blockchain.service.ts
│   │   │   ├── contracts/
│   │   │   │   ├── DegreeAttestation.json (ABI)
│   │   │   │   └── contract.config.ts
│   │   │   └── ethers.provider.ts
│   │   ├── qr/
│   │   │   ├── qr.module.ts
│   │   │   ├── qr.service.ts
│   │   ├── verification/
│   │   │   ├── verification.module.ts
│   │   │   ├── verification.controller.ts
│   │   │   └── verification.service.ts
│   │   └── audit-log/
│   │       ├── audit-log.module.ts
│   │       ├── audit-log.service.ts
│   │       └── audit-log.controller.ts
│   └── jobs/                          // optional: BullMQ background jobs
│       ├── ocr.processor.ts
│       └── blockchain.processor.ts
├── test/
├── .env.example
├── nest-cli.json
├── tsconfig.json
└── package.json
```

## 2. REST API Design

Base URL: `/api/v1`
Swagger: `/api/docs`

### 2.1 Auth Module

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register student account |
| POST | `/auth/login` | Public | Login, returns access + refresh token |
| POST | `/auth/refresh` | Refresh Token | Issue new access token |
| POST | `/auth/logout` | JWT | Invalidate refresh token |
| GET | `/auth/verify-email/:token` | Public | Verify email |
| POST | `/auth/forgot-password` | Public | Send reset link |
| POST | `/auth/reset-password` | Public | Reset password with token |
| GET | `/auth/me` | JWT | Get current user profile |

### 2.2 Users Module (Admin)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/users` | ADMIN | List all users (paginated, filter by role) |
| GET | `/users/:id` | ADMIN | Get user details |
| POST | `/users` | ADMIN | Create officer/registrar/admin account |
| PATCH | `/users/:id` | ADMIN | Update role/status |
| DELETE | `/users/:id` | ADMIN | Deactivate user |

### 2.3 Personal Details

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/personal-details/me` | STUDENT | Get own personal details |
| PUT | `/personal-details/me` | STUDENT | Create/update personal details |

### 2.4 Applications

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/applications` | STUDENT | Create draft application |
| GET | `/applications/me` | STUDENT | List own applications |
| GET | `/applications/:id` | STUDENT/OFFICER/REGISTRAR/ADMIN | Get application detail |
| GET | `/applications` | OFFICER/REGISTRAR/ADMIN | List all (filter by status) |
| PATCH | `/applications/:id/submit` | STUDENT | Submit for review |
| PATCH | `/applications/:id/review` | VERIFICATION_OFFICER | Approve/reject (stage 1) |
| PATCH | `/applications/:id/registrar-review` | REGISTRAR | Final approve/reject |

### 2.5 Degree Details

| Method | Endpoint | Role | Description |
|---|---|---|---|
| PUT | `/applications/:id/degree-detail` | STUDENT | Create/update degree detail |
| GET | `/applications/:id/degree-detail` | STUDENT/OFFICER/REGISTRAR/ADMIN | Get degree detail |

### 2.6 Attestation Details

| Method | Endpoint | Role | Description |
|---|---|---|---|
| PUT | `/applications/:id/attestation-detail` | STUDENT | Set type/delivery/priority -> computes fee |
| GET | `/applications/:id/attestation-detail` | STUDENT/OFFICER/REGISTRAR/ADMIN | Get attestation detail |

### 2.7 Documents

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/applications/:id/documents` | STUDENT | Upload document (multipart, type in body) |
| GET | `/applications/:id/documents` | STUDENT/OFFICER/REGISTRAR/ADMIN | List documents |
| DELETE | `/applications/:id/documents/:docId` | STUDENT | Remove document (before submission) |

### 2.8 OCR

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/applications/:id/documents/:docId/ocr` | STUDENT/SYSTEM | Trigger OCR extraction |
| GET | `/applications/:id/ocr-results` | STUDENT/OFFICER/REGISTRAR/ADMIN | Get all OCR results |

### 2.9 Validation

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/applications/:id/validate` | SYSTEM (auto on submit) | Run validation, return score |
| GET | `/applications/:id/validation-result` | STUDENT/OFFICER/REGISTRAR/ADMIN | Get validation result |

### 2.10 Vouchers

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/applications/:id/voucher` | SYSTEM (auto on officer approval) | Generate voucher |
| GET | `/applications/:id/voucher` | STUDENT/OFFICER/REGISTRAR/ADMIN | Get voucher details |
| GET | `/applications/:id/voucher/pdf` | STUDENT | Download voucher PDF |

### 2.11 Payments

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/applications/:id/payments` | STUDENT | Submit payment (method, ref, proof) |
| GET | `/applications/:id/payments` | STUDENT/OFFICER/REGISTRAR/ADMIN | List payments |
| PATCH | `/payments/:paymentId/verify` | OFFICER/REGISTRAR/ADMIN | Approve/reject payment |

### 2.12 Certificates (Degree Generation)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/applications/:id/certificates/generate` | REGISTRAR/ADMIN | Generate degree/transcript/attestation PDF |
| GET | `/applications/:id/certificates` | STUDENT/OFFICER/REGISTRAR/ADMIN | List generated certificates |
| GET | `/certificates/:id/download` | STUDENT/REGISTRAR/ADMIN | Download PDF |

### 2.13 Blockchain

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/applications/:id/blockchain/register` | REGISTRAR/ADMIN | Register degree hash on-chain |
| POST | `/applications/:id/blockchain/revoke` | ADMIN | Revoke degree on-chain |
| GET | `/applications/:id/blockchain` | STUDENT/OFFICER/REGISTRAR/ADMIN | Get blockchain record |
| GET | `/blockchain/verify/:degreeId` | Public | Read on-chain status |

### 2.14 QR

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/applications/:id/qr/generate` | SYSTEM (auto after blockchain registration) | Generate QR code |
| GET | `/applications/:id/qr` | STUDENT/REGISTRAR/ADMIN | Get QR image URL |

### 2.15 Verification Portal (Public)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/verify/degree-id/:degreeId` | Public | Verify by Degree ID |
| POST | `/verify/qr` | Public | Verify by scanned QR payload |
| POST | `/verify/cnic` | Public | Verify by CNIC (rate-limited, returns minimal info) |

### 2.16 Audit Log

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/audit-logs` | ADMIN | List logs (filter by user, action, date range) |
| GET | `/audit-logs/me` | Any authenticated | View own action history |

## 3. DTO Definitions (Representative)

```ts
// auth/dto/register.dto.ts
export class RegisterDto {
  @IsEmail() email: string;
  @MinLength(8) @Matches(/^(?=.*[A-Z])(?=.*\d).+$/) password: string;
  @IsString() @MinLength(2) firstName: string;
  @IsString() @MinLength(2) lastName: string;
}

// auth/dto/login.dto.ts
export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

// personal-details/dto/create-personal-detail.dto.ts
export class CreatePersonalDetailDto {
  @IsOptional() @IsUrl() profilePicture?: string;
  @IsOptional() @IsString() title?: string;
  @IsString() @MinLength(2) firstName: string;
  @IsOptional() @IsString() middleName?: string;
  @IsString() @MinLength(2) lastName: string;
  @IsEnum(MaritalStatus) @IsOptional() maritalStatus?: MaritalStatus;
  @IsEnum(Gender) gender: Gender;
  @IsDateString() dateOfBirth: string;
  @IsString() fatherName: string;
  @IsString() address: string;
  @IsString() country: string;
  @IsString() city: string;
  @Matches(/^\d{5}-\d{7}-\d{1}$/, { message: 'CNIC must be in format XXXXX-XXXXXXX-X' })
  cnic: string;
}

// degree-details/dto/create-degree-detail.dto.ts
export class CreateDegreeDetailDto {
  @IsString() university: string;
  @IsString() department: string;
  @IsString() degreeProgram: string;
  @IsInt() @Min(1950) @Max(2100) passingYear: number;
  @IsString() rollNumber: string;
  @IsString() registrationNumber: string;
  @IsNumber() @Min(0) @Max(4.0) cgpa: number;
}

// attestation/dto/create-attestation.dto.ts
export class CreateAttestationDto {
  @IsEnum(AttestationType) type: AttestationType;
  @IsEnum(DeliveryMethod) delivery: DeliveryMethod;
  @IsEnum(Priority) priority: Priority;
}

// documents/dto/upload-document.dto.ts
export class UploadDocumentDto {
  @IsEnum(DocumentType) type: DocumentType;
  // file comes via multipart 'file' field, handled by Multer/Cloudinary interceptor
}

// payments/dto/create-payment.dto.ts
export class CreatePaymentDto {
  @IsEnum(PaymentMethod) method: PaymentMethod;
  @IsString() transactionRef: string;
  @IsOptional() @IsUrl() proofUrl?: string;
}

// payments/dto/verify-payment.dto.ts
export class VerifyPaymentDto {
  @IsEnum(['APPROVED', 'REJECTED']) decision: 'APPROVED' | 'REJECTED';
  @IsOptional() @IsString() rejectionReason?: string;
}

// applications/dto/review-application.dto.ts
export class ReviewApplicationDto {
  @IsEnum(['APPROVED', 'REJECTED']) decision: 'APPROVED' | 'REJECTED';
  @IsOptional() @IsString() rejectionReason?: string;
}

// verification/dto/verify-qr.dto.ts
export class VerifyQrDto {
  @IsString() payload: string; // raw QR string, parsed server-side
}
```

## 4. Sample Controller (Applications)

```ts
@ApiTags('applications')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Post()
  create(@CurrentUser() user: AuthUser) {
    return this.service.createDraft(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Patch(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.submit(id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VERIFICATION_OFFICER, Role.ADMIN)
  @Patch(':id/review')
  review(@Param('id') id: string, @Body() dto: ReviewApplicationDto, @CurrentUser() user: AuthUser) {
    return this.service.officerReview(id, dto, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.REGISTRAR, Role.ADMIN)
  @Patch(':id/registrar-review')
  registrarReview(@Param('id') id: string, @Body() dto: ReviewApplicationDto, @CurrentUser() user: AuthUser) {
    return this.service.registrarReview(id, dto, user.id);
  }
}
```

## 5. Fee Calculation Logic (Attestation Module)

```ts
const BASE_FEES: Record<AttestationType, number> = {
  DEGREE_ATTESTATION: 3000,
  TRANSCRIPT_ATTESTATION: 2000,
  DEGREE_GENERATION: 5000,
  DUPLICATE_DEGREE: 4000,
};

const URGENT_SURCHARGE_PCT = 0.5; // +50%
const PHYSICAL_DELIVERY_FEE = 500; // courier

export function calculateFee(type: AttestationType, delivery: DeliveryMethod, priority: Priority) {
  const baseFee = BASE_FEES[type];
  const urgentFee = priority === Priority.URGENT ? baseFee * URGENT_SURCHARGE_PCT : 0;
  const deliveryFee = delivery === DeliveryMethod.PHYSICAL ? PHYSICAL_DELIVERY_FEE : 0;
  const totalFee = baseFee + urgentFee + deliveryFee;
  return { baseFee, urgentFee, deliveryFee, totalFee };
}
```
