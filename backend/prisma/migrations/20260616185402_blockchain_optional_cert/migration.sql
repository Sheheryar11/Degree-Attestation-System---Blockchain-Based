-- DropForeignKey
ALTER TABLE "blockchain_records" DROP CONSTRAINT "blockchain_records_certificateId_fkey";

-- AlterTable
ALTER TABLE "blockchain_records" ADD COLUMN     "degreeHash" TEXT,
ALTER COLUMN "certificateId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "blockchain_records" ADD CONSTRAINT "blockchain_records_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "generated_certificates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
