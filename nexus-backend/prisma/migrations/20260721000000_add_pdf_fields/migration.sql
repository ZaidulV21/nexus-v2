-- AlterTable: Add PDF fields to Quotation and Invoice
ALTER TABLE "quotations" ADD COLUMN "pdfUrl" TEXT,
ADD COLUMN "pdfGeneratedAt" TIMESTAMPTZ(6);

ALTER TABLE "invoices" ADD COLUMN "pdfUrl" TEXT,
ADD COLUMN "pdfGeneratedAt" TIMESTAMPTZ(6);
