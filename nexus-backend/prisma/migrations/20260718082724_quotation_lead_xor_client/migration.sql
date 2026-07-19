-- Make leadId nullable and update foreign key for Lead-XOR-Client quotation model
-- DropForeignKey
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_leadId_fkey";

-- AlterTable: make leadId nullable
ALTER TABLE "quotations" ALTER COLUMN "leadId" DROP NOT NULL;

-- AddForeignKey with SET NULL on delete
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
