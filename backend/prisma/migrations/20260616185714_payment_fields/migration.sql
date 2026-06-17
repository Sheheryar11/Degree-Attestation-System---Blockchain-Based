-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentDate" TIMESTAMP(3),
ADD COLUMN     "transactionId" TEXT,
ALTER COLUMN "method" SET DEFAULT 'BANK_CHALLAN';
