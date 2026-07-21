-- AlterTable: Add PDF enhancement fields to Quotation
ALTER TABLE "quotations" ADD COLUMN "validUntil"        TIMESTAMP(3),
 ADD COLUMN "notes"              TEXT,
 ADD COLUMN "termsAndConditions" TEXT,
 ADD COLUMN "paymentTerms"       TEXT;

-- AlterTable: Add GSTIN to Client
ALTER TABLE "clients" ADD COLUMN "gstin" TEXT;

-- AlterTable: Add service name and HSN/SAC code to QuotationItem
ALTER TABLE "quotation_items" ADD COLUMN "serviceName" TEXT,
 ADD COLUMN "hsnSacCode"      TEXT;
