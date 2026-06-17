-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'OFFICER', 'REGISTRAR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'OFFICER_APPROVED', 'OFFICER_REJECTED', 'REGISTRAR_REVIEW', 'REGISTRAR_APPROVED', 'REGISTRAR_REJECTED', 'RETURNED', 'PAYMENT_PENDING', 'PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'CERTIFICATE_GENERATING', 'CERTIFICATE_GENERATED', 'BLOCKCHAIN_PENDING', 'COMPLETED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AttestationType" AS ENUM ('DOMESTIC', 'INTERNATIONAL', 'DUPLICATE', 'TRANSCRIPT', 'MIGRATION');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('SELF_PICKUP', 'COURIER_DOMESTIC', 'COURIER_INTERNATIONAL');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('NORMAL', 'URGENT', 'EXPRESS');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CNIC_FRONT', 'CNIC_BACK', 'PHOTO', 'TRANSCRIPT', 'DEGREE', 'BANK_RECEIPT', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_CHALLAN', 'EASYPAISA', 'JAZZCASH', 'CARD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('ATTESTATION', 'DUPLICATE_DEGREE', 'TRANSCRIPT');

-- CreateEnum
CREATE TYPE "BlockchainStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'CONFIRMED', 'REVOKED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('REGISTER', 'LOGIN', 'LOGOUT', 'EMAIL_VERIFIED', 'PASSWORD_RESET', 'APPLICATION_CREATED', 'APPLICATION_SUBMITTED', 'APPLICATION_REVIEWED', 'APPLICATION_APPROVED', 'APPLICATION_REJECTED', 'APPLICATION_RETURNED', 'DOCUMENT_UPLOADED', 'DOCUMENT_DELETED', 'PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'VOUCHER_GENERATED', 'CERTIFICATE_GENERATED', 'BLOCKCHAIN_SUBMITTED', 'BLOCKCHAIN_CONFIRMED', 'BLOCKCHAIN_REVOKED', 'VERIFICATION_QUERIED', 'USER_DEACTIVATED', 'USER_ROLE_CHANGED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyToken" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_details" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "fatherName" TEXT,
    "cnic" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "maritalStatus" "MaritalStatus",
    "nationality" TEXT,
    "domicileProvince" TEXT,
    "permanentAddress" TEXT,
    "currentAddress" TEXT,
    "phoneNumber" TEXT,
    "whatsappNumber" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reviewedByOfficerId" TEXT,
    "reviewedByRegistrarId" TEXT,
    "attestationType" "AttestationType" NOT NULL DEFAULT 'DOMESTIC',
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "totalFee" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3),
    "officerReviewedAt" TIMESTAMP(3),
    "registrarReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "degree_details" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "universityName" TEXT,
    "degreeName" TEXT,
    "degreeProgram" TEXT,
    "degreeType" "CertificateType",
    "rollNumber" TEXT,
    "registrationNumber" TEXT,
    "graduationYear" INTEGER,
    "cgpa" TEXT,
    "division" TEXT,
    "degreeSerialNumber" TEXT,
    "degreeIssuanceDate" TEXT,
    "transcriptSerialNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "degree_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attestation_details" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "attestationType" "AttestationType",
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'SELF_PICKUP',
    "numberOfCopies" INTEGER NOT NULL DEFAULT 1,
    "destinationCountry" TEXT,
    "purposeOfAttestation" TEXT,
    "employerName" TEXT,
    "deliveryAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attestation_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "cloudinaryUrl" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "sha256Hash" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_results" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "rawText" TEXT,
    "extractedData" JSONB,
    "confidenceScore" DOUBLE PRECISION,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "validationNotes" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocr_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "pdfUrl" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION NOT NULL,
    "transactionRef" TEXT,
    "receiptUrl" TEXT,
    "rejectionReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_certificates" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "CertificateType" NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "sha256Hash" TEXT NOT NULL,
    "qrCodeUrl" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_records" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "degreeId" TEXT NOT NULL,
    "txHash" TEXT,
    "blockNumber" INTEGER,
    "contractAddress" TEXT,
    "status" "BlockchainStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "registeredAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "blockchain_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" TEXT NOT NULL,
    "blockchainRecordId" TEXT,
    "degreeIdQueried" TEXT NOT NULL,
    "queryMethod" TEXT NOT NULL,
    "found" BOOLEAN NOT NULL,
    "verifierIp" TEXT,
    "result" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "applicationId" TEXT,
    "action" "AuditAction" NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_userId_key" ON "personal_details"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "applications_trackingNumber_key" ON "applications"("trackingNumber");

-- CreateIndex
CREATE INDEX "applications_studentId_status_idx" ON "applications"("studentId", "status");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "degree_details_applicationId_key" ON "degree_details"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "attestation_details_applicationId_key" ON "attestation_details"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "ocr_results_documentId_key" ON "ocr_results"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_applicationId_key" ON "vouchers"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_voucherNumber_key" ON "vouchers"("voucherNumber");

-- CreateIndex
CREATE INDEX "payments_applicationId_status_idx" ON "payments"("applicationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "generated_certificates_sha256Hash_key" ON "generated_certificates"("sha256Hash");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_records_applicationId_key" ON "blockchain_records"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_records_certificateId_key" ON "blockchain_records"("certificateId");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_records_degreeId_key" ON "blockchain_records"("degreeId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_applicationId_idx" ON "audit_logs"("applicationId");

-- AddForeignKey
ALTER TABLE "personal_details" ADD CONSTRAINT "personal_details_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewedByOfficerId_fkey" FOREIGN KEY ("reviewedByOfficerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewedByRegistrarId_fkey" FOREIGN KEY ("reviewedByRegistrarId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "degree_details" ADD CONSTRAINT "degree_details_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attestation_details" ADD CONSTRAINT "attestation_details_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_results" ADD CONSTRAINT "ocr_results_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_results" ADD CONSTRAINT "ocr_results_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_certificates" ADD CONSTRAINT "generated_certificates_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_records" ADD CONSTRAINT "blockchain_records_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_records" ADD CONSTRAINT "blockchain_records_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "generated_certificates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_blockchainRecordId_fkey" FOREIGN KEY ("blockchainRecordId") REFERENCES "blockchain_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
