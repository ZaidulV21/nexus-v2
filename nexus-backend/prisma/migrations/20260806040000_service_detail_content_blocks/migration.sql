-- AlterTable: Service public detail-page content blocks. JSON arrays
-- mirroring SubService (features, whatsIncluded, process, faqs) plus a new
-- testimonials array. Defaults to '[]' so existing rows are unaffected.
ALTER TABLE "services" ADD COLUMN "features" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "whatsIncluded" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "process" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "faqs" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "testimonials" JSONB NOT NULL DEFAULT '[]';
