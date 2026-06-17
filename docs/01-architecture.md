# System Architecture, Deployment, Security & RBAC

## 1. High-Level Architecture

```mermaid
flowchart LR
    subgraph Client
        WEB[Next.js 15 Web App\nStudent / Officer / Registrar / Admin Portals]
        PUB[Public Verification Portal]
    end

    subgraph API[NestJS API Gateway]
        AUTH[Auth Module]
        APP[Application Module]
        DOC[Document Module]
        OCR[OCR Module]
        VAL[Validation Module]
        VOU[Voucher Module]
        PAY[Payment Module]
        DEG[Degree Generation Module]
        BC[Blockchain Module]
        QR[QR Module]
        VERIFY[Verification Module]
        LOG[Audit Log Module]
    end

    subgraph External Services
        GVISION[Google Cloud Vision OCR]
        CLOUD[Cloudinary Storage]
        POLYGON[Polygon Amoy Testnet]
        SMTP[Email Service]
    end

    subgraph Data
        PG[(PostgreSQL)]
    end

    WEB -->|REST/JSON + JWT| API
    PUB -->|Public REST| VERIFY
    DOC --> CLOUD
    OCR --> GVISION
    BC --> POLYGON
    AUTH --> SMTP
    API --> PG
```

## 2. Low-Level Architecture (Request Lifecycle Example: Submit Degree for Attestation)

```mermaid
flowchart TD
    A[Next.js Form Submit] --> B[NestJS Controller: ApplicationController]
    B --> C[ValidationPipe - Zod/class-validator DTO]
    C --> D[ApplicationService]
    D --> E{Document Uploaded?}
    E -->|No| F[Return 400 - Missing Documents]
    E -->|Yes| G[DocumentService -> Cloudinary Upload]
    G --> H[OcrService -> Google Vision]
    H --> I[ValidationService: Compare OCR vs Form Data]
    I --> J[Prisma: persist Application + Documents + ValidationResult]
    J --> K[AuditLogService: log SUBMIT_APPLICATION]
    K --> L[Response: Application Status = PENDING_REVIEW]
```

## 3. Layered Backend Architecture (NestJS)

```mermaid
flowchart TB
    Controller --> Service
    Service --> Repository[Prisma Service / Repository Layer]
    Repository --> DB[(PostgreSQL)]
    Service --> ExternalAdapters[Adapters: Cloudinary, GoogleVision, Blockchain, Puppeteer, QRCode]
    Controller --> Guards[Guards: JwtAuthGuard, RolesGuard]
    Controller --> Pipes[ValidationPipe DTOs]
    Service --> Events[Event Emitter: AuditLog, Notifications]
```

## 4. Deployment Architecture

```mermaid
flowchart TB
    subgraph CDN/Edge
        VERCEL[Vercel - Next.js Frontend]
    end

    subgraph Cloud Compute - Railway/Render/AWS
        API1[NestJS API - Instance 1]
        API2[NestJS API - Instance 2]
        LB[Load Balancer / Reverse Proxy - Nginx]
    end

    subgraph Managed Services
        RDS[(PostgreSQL - Managed e.g. Supabase/Neon/RDS)]
        CLOUDINARY[Cloudinary CDN]
        VISION[Google Cloud Vision API]
    end

    subgraph Blockchain
        AMOY[Polygon Amoy Testnet RPC - Alchemy/Infura]
        CONTRACT[DegreeAttestation.sol Deployed Contract]
    end

    USER[Users: Students/Officers/Verifiers] --> VERCEL
    VERCEL -->|HTTPS REST| LB
    LB --> API1
    LB --> API2
    API1 --> RDS
    API2 --> RDS
    API1 --> CLOUDINARY
    API1 --> VISION
    API1 -->|ethers.js| AMOY
    AMOY --> CONTRACT
```

### Environments

| Env | Purpose | Notes |
|---|---|---|
| `development` | Local dev | Local Postgres (Docker), Hardhat local node, Cloudinary sandbox |
| `staging` | Pre-prod testing | Polygon Amoy testnet, managed Postgres |
| `production` | Live demo / submission | Polygon Amoy (mainnet not required for academic project) |

### CI/CD (Conceptual)

```mermaid
flowchart LR
    GIT[Git Push] --> CI[GitHub Actions]
    CI --> LINT[Lint + TypeCheck]
    LINT --> TEST[Unit & E2E Tests - Jest]
    TEST --> BUILD[Build Next.js + NestJS]
    BUILD --> MIGRATE[Prisma Migrate Deploy]
    MIGRATE --> DEPLOY_API[Deploy API - Render/Railway]
    BUILD --> DEPLOY_WEB[Deploy Web - Vercel]
    TEST --> CONTRACT_TEST[Hardhat Tests]
    CONTRACT_TEST --> DEPLOY_CONTRACT[Deploy/Verify on Amoy - one-time per release]
```

## 5. Security Design

### 5.1 Authentication & Session Security
- **JWT Access Token** (short-lived, 15 min) + **Refresh Token** (httpOnly secure cookie, 7 days, rotated on use).
- Passwords hashed with **bcrypt** (cost factor 12).
- Email verification via signed token (JWT or random token + expiry) sent through SMTP.
- Password reset via single-use, time-limited token (15 min expiry).

### 5.2 Transport & Storage Security
- HTTPS enforced everywhere (HSTS).
- All file uploads validated for MIME type, extension, and size (max 5MB) before Cloudinary upload.
- Cloudinary uploads use **signed upload presets** — signature generated server-side, never expose API secret to client.
- CNIC numbers and sensitive PII encrypted at rest using application-level AES-256-GCM (Prisma middleware) for `cnic`, `cnicFront`/`cnicBack` references.

### 5.3 API Security
- **Helmet** for HTTP headers.
- **Rate limiting** (`@nestjs/throttler`) — especially on auth, OCR, and verification endpoints (prevent brute force / scraping).
- **CORS** restricted to known frontend origins.
- Input validation via `class-validator` + Zod (frontend mirrors backend schema).
- SQL injection prevented inherently via Prisma parameterized queries.
- File upload virus/type scanning (basic MIME sniffing via `file-type` package).

### 5.4 Blockchain Security
- Backend's blockchain signer wallet private key stored in secrets manager / `.env` (never committed).
- Only backend (Registrar-triggered, server-signed) can call `registerDegree()` and `revokeDegree()` — enforced via `onlyOwner`/`onlyRegistrar` modifier on the contract, where "owner" = backend's wallet address.
- `verifyDegree()` is a public `view` function — no gas cost, callable by anyone (including frontend via read-only RPC call).

### 5.5 Audit & Monitoring
- Every sensitive action (login, document upload, approval, rejection, blockchain registration, verification request) written to `AuditLog` table with actor, IP, timestamp, and metadata (see [07-modules-detail.md](07-modules-detail.md)).
- Centralized error logging (e.g., Sentry) for backend exceptions.

## 6. Role-Based Access Control (RBAC)

### 6.1 Roles Enum

```ts
enum Role {
  STUDENT
  VERIFICATION_OFFICER
  REGISTRAR
  ADMIN
}
```//note: External Verifier is unauthenticated/public, not part of Role enum

### 6.2 Permission Matrix

| Resource / Action | Student | Verification Officer | Registrar | Admin |
|---|---|---|---|---|
| Register / Login | ✅ | ✅ (created by Admin) | ✅ (created by Admin) | ✅ |
| Submit Application | ✅ (own) | ❌ | ❌ | ❌ |
| View Own Application | ✅ | ❌ | ❌ | ✅ |
| View All Applications | ❌ | ✅ | ✅ | ✅ |
| Review/Verify Documents | ❌ | ✅ | ✅ | ✅ |
| Approve/Reject Application | ❌ | ✅ (stage 1) | ✅ (final) | ✅ |
| Generate Voucher | system-triggered (post officer approval) | | | |
| Verify Payment | ❌ | ✅ | ✅ | ✅ |
| Generate Degree/Transcript PDF | ❌ | ❌ | ✅ | ✅ |
| Trigger Blockchain Registration | ❌ | ❌ | ✅ | ✅ |
| Manage Users / Officers | ❌ | ❌ | ❌ | ✅ |
| View Reports / Audit Logs | ❌ | partial (own actions) | partial | ✅ |
| Public Verification (QR/ID/CNIC) | ✅ (public, no auth) |

### 6.3 Guard Implementation Pattern (NestJS)

```ts
// roles.decorator.ts
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}

// usage
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.REGISTRAR, Role.ADMIN)
@Post(':id/generate-degree')
generateDegree(@Param('id') id: string) { ... }
```

## 7. Application Status Lifecycle (State Machine)

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> SUBMITTED: student submits
    SUBMITTED --> UNDER_REVIEW: officer picks up
    UNDER_REVIEW --> REJECTED: officer rejects
    UNDER_REVIEW --> APPROVED_BY_OFFICER: officer approves
    REJECTED --> SUBMITTED: student resubmits
    APPROVED_BY_OFFICER --> VOUCHER_GENERATED: system generates voucher
    VOUCHER_GENERATED --> PAYMENT_PENDING
    PAYMENT_PENDING --> PAYMENT_SUBMITTED: student uploads proof / pays online
    PAYMENT_SUBMITTED --> PAYMENT_VERIFIED: officer/admin verifies
    PAYMENT_SUBMITTED --> PAYMENT_REJECTED
    PAYMENT_REJECTED --> PAYMENT_PENDING
    PAYMENT_VERIFIED --> REGISTRAR_REVIEW
    REGISTRAR_REVIEW --> REGISTRAR_APPROVED
    REGISTRAR_REVIEW --> REGISTRAR_REJECTED
    REGISTRAR_APPROVED --> CERTIFICATE_GENERATED: Puppeteer PDF
    CERTIFICATE_GENERATED --> BLOCKCHAIN_REGISTERED: registerDegree()
    BLOCKCHAIN_REGISTERED --> QR_GENERATED
    QR_GENERATED --> COMPLETED
    REGISTRAR_REJECTED --> [*]
```
