# Sequence, Use Case, Class & Activity Diagrams

## 1. Use Case Diagram

```mermaid
flowchart LR
    Student((Student))
    Officer((Verification Officer))
    Registrar((Registrar))
    Admin((Admin))
    Verifier((External Verifier))

    subgraph System["Degree Attestation System"]
        UC1[Register / Login]
        UC2[Submit Attestation Application]
        UC3[Upload Documents]
        UC4[Track Application Status]
        UC5[Download Voucher/Certificate]
        UC6[Review & Verify Documents]
        UC7[Approve/Reject Application]
        UC8[Verify Payment]
        UC9[Generate Certificates]
        UC10[Register Degree on Blockchain]
        UC11[Revoke Degree]
        UC12[Manage Users]
        UC13[View Reports & Audit Logs]
        UC14[Verify Degree - QR/ID/CNIC]
    end

    Student --> UC1
    Student --> UC2
    Student --> UC3
    Student --> UC4
    Student --> UC5

    Officer --> UC1
    Officer --> UC6
    Officer --> UC7
    Officer --> UC8

    Registrar --> UC1
    Registrar --> UC7
    Registrar --> UC8
    Registrar --> UC9
    Registrar --> UC10

    Admin --> UC1
    Admin --> UC12
    Admin --> UC13
    Admin --> UC11

    Verifier --> UC14
```

## 2. Sequence Diagram — Full Application Lifecycle

```mermaid
sequenceDiagram
    actor S as Student
    participant FE as Next.js Frontend
    participant API as NestJS API
    participant OCR as Google Vision
    participant CL as Cloudinary
    participant DB as PostgreSQL
    actor VO as Verification Officer
    actor R as Registrar
    participant BC as Polygon Amoy

    S->>FE: Fill Personal/Degree/Attestation forms
    FE->>API: PUT personal-details / degree-detail / attestation-detail
    API->>DB: Save records

    S->>FE: Upload CNIC, Photo, Transcript, Degree
    FE->>API: POST documents (multipart)
    API->>CL: Upload file
    CL-->>API: secure_url
    API->>DB: Save Document

    API->>OCR: textDetection(documentUrl)
    OCR-->>API: rawText + confidence
    API->>DB: Save OcrResult

    S->>FE: Submit Application
    FE->>API: PATCH /applications/:id/submit
    API->>API: ValidationService.validate()
    API->>DB: Save ValidationResult
    API->>DB: Application.status = SUBMITTED -> UNDER_REVIEW

    VO->>FE: Open review queue
    FE->>API: GET /applications?status=UNDER_REVIEW
    VO->>FE: Compare OCR vs entered, approve
    FE->>API: PATCH /applications/:id/review {APPROVED}
    API->>DB: status = APPROVED_BY_OFFICER
    API->>API: VoucherService.generate()
    API->>DB: status = VOUCHER_GENERATED -> PAYMENT_PENDING

    S->>FE: Submit payment proof
    FE->>API: POST /applications/:id/payments
    API->>DB: status = PAYMENT_SUBMITTED

    VO->>FE: Verify payment
    FE->>API: PATCH /payments/:id/verify {APPROVED}
    API->>DB: status = PAYMENT_VERIFIED -> REGISTRAR_REVIEW

    R->>FE: Final review, generate certificate
    FE->>API: POST /applications/:id/certificates/generate
    API->>API: Puppeteer renders PDF, computes SHA-256
    API->>CL: Upload PDF
    API->>DB: status = CERTIFICATE_GENERATED

    R->>FE: Trigger blockchain registration
    FE->>API: POST /applications/:id/blockchain/register
    API->>BC: registerDegree(degreeId, studentHash, sha256Hash)
    BC-->>API: txHash, blockNumber
    API->>DB: status = BLOCKCHAIN_REGISTERED

    API->>API: QrService.generate()
    API->>DB: status = QR_GENERATED -> COMPLETED

    S->>FE: Download final certificate with QR
```

## 3. Sequence Diagram — Public Verification

```mermaid
sequenceDiagram
    actor V as External Verifier
    participant FE as Verification Portal (Next.js)
    participant API as NestJS API
    participant DB as PostgreSQL
    participant BC as Polygon Amoy

    V->>FE: Scan QR / enter Degree ID
    FE->>API: GET /verify/degree-id/:degreeId
    API->>DB: Find BlockchainRecord by degreeId
    alt record not found
        API-->>FE: { found: false }
    else record found
        API->>BC: verifyDegree(degreeId) [read-only]
        BC-->>API: { found, sha256Hash, timestamp, status }
        API->>DB: Log VerificationRequest
        API-->>FE: { studentName, degree, university, status, txHash }
    end
    FE-->>V: Render Verification Result Card
```

## 4. Class Diagram (Backend Domain Model)

```mermaid
classDiagram
    class User {
        +string id
        +string email
        +string passwordHash
        +Role role
        +boolean isEmailVerified
    }

    class PersonalDetail {
        +string firstName
        +string lastName
        +string cnic
        +Gender gender
        +Date dateOfBirth
    }

    class Application {
        +string applicationNumber
        +ApplicationStatus status
        +DateTime submittedAt
        +submit()
        +officerReview(decision)
        +registrarReview(decision)
    }

    class DegreeDetail {
        +string university
        +string degreeProgram
        +string registrationNumber
        +float cgpa
    }

    class AttestationDetail {
        +AttestationType type
        +DeliveryMethod delivery
        +Priority priority
        +float totalFee
        +calculateFee()
    }

    class Document {
        +DocumentType type
        +string cloudinaryUrl
    }

    class OcrResult {
        +Json extractedData
        +float confidenceScore
        +parse()
    }

    class ValidationResult {
        +float overallScore
        +boolean passed
        +Json mismatchReport
    }

    class Voucher {
        +string voucherNumber
        +float amount
        +DateTime expiryDate
        +generatePdf()
    }

    class Payment {
        +PaymentMethod method
        +PaymentStatus status
        +string transactionRef
        +verify(decision)
    }

    class GeneratedCertificate {
        +CertificateType type
        +string pdfUrl
        +string sha256Hash
        +generate()
    }

    class BlockchainRecord {
        +string degreeId
        +string txHash
        +BlockchainStatus status
        +registerOnChain()
        +revoke()
    }

    class VerificationRequest {
        +string degreeIdQueried
        +string method
        +boolean found
    }

    class AuditLog {
        +AuditAction action
        +Json metadata
    }

    User "1" --> "0..1" PersonalDetail
    User "1" --> "*" Application : submits
    User "1" --> "*" Application : reviews
    Application "1" --> "1" DegreeDetail
    Application "1" --> "1" AttestationDetail
    Application "1" --> "*" Document
    Document "1" --> "0..1" OcrResult
    Application "1" --> "0..1" ValidationResult
    Application "1" --> "0..1" Voucher
    Application "1" --> "*" Payment
    Voucher "1" --> "*" Payment
    Application "1" --> "*" GeneratedCertificate
    Application "1" --> "0..1" BlockchainRecord
    GeneratedCertificate "1" --> "0..1" BlockchainRecord
    BlockchainRecord "1" --> "*" VerificationRequest
    User "1" --> "*" AuditLog
```

## 5. Activity Diagram — Student Application Submission

```mermaid
flowchart TD
    Start([Start]) --> A[Login as Student]
    A --> B[Fill Personal Details]
    B --> C[Fill Degree Details]
    C --> D[Select Attestation Type, Delivery, Priority]
    D --> E[Upload Required Documents]
    E --> F[System runs OCR on each document]
    F --> G{All confidence scores acceptable?}
    G -->|No| E
    G -->|Yes| H[Click Submit]
    H --> I[System runs Validation]
    I --> J{Validation score >= 80?}
    J -->|No| K[Show Mismatch Report]
    K --> B
    J -->|Yes| L[Application status = SUBMITTED]
    L --> End([End - Awaiting Officer Review])
```

## 6. Activity Diagram — Officer & Registrar Processing

```mermaid
flowchart TD
    Start([Officer opens queue]) --> A[Select SUBMITTED application]
    A --> B[Review OCR vs entered data side-by-side]
    B --> C{Decision}
    C -->|Reject| D[Set rejectionReason, status = REJECTED]
    D --> E[Notify student]
    E --> End1([End])
    C -->|Approve| F[status = APPROVED_BY_OFFICER]
    F --> G[System generates Voucher PDF]
    G --> H[Student pays & submits proof]
    H --> I[Officer/Admin verifies payment]
    I --> J{Payment valid?}
    J -->|No| H
    J -->|Yes| K[status = REGISTRAR_REVIEW]
    K --> L[Registrar final review]
    L --> M{Decision}
    M -->|Reject| N[status = REGISTRAR_REJECTED]
    N --> End2([End])
    M -->|Approve| O[Generate Certificate PDF - Puppeteer]
    O --> P[Compute SHA-256, upload Cloudinary]
    P --> Q[Register on Blockchain - registerDegree]
    Q --> R[Generate QR Code]
    R --> S[status = COMPLETED]
    S --> End3([End])
```

## 7. Activity Diagram — Public Verification

```mermaid
flowchart TD
    Start([Verifier visits /verify]) --> A{Choose Method}
    A -->|Degree ID| B[Enter Degree ID]
    A -->|QR| C[Scan QR with camera]
    A -->|CNIC| D[Enter CNIC number]
    B --> E[API lookup]
    C --> E
    D --> E
    E --> F{Record exists?}
    F -->|No| G[Show 'Not Found']
    F -->|Yes| H[Query smart contract verifyDegree]
    H --> I{Status = Registered?}
    I -->|Yes| J[Show Verified result: name, degree, university, date, tx link]
    I -->|No - Revoked/NotRegistered| K[Show 'Invalid / Revoked']
    G & J & K --> End([Log VerificationRequest, End])
```
