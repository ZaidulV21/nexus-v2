-- Phase 13b: drop the legacy JSON content columns and flat SEO columns from
-- services / sub_services. All of this data was copied into the normalized
-- child tables by migration 20260809172248_phase13a_cms_normalized_tables and
-- verified row-for-row; the assembled { features, whatsIncluded, process,
-- faqs, testimonials, gallery, seo } API shape is rebuilt by the service layer
-- from those tables, so nothing is lost.

-- services
ALTER TABLE "services" DROP COLUMN "seoTitle";
ALTER TABLE "services" DROP COLUMN "metaDescription";
ALTER TABLE "services" DROP COLUMN "metaKeywords";
ALTER TABLE "services" DROP COLUMN "ogImage";
ALTER TABLE "services" DROP COLUMN "canonicalUrl";
ALTER TABLE "services" DROP COLUMN "structuredData";
ALTER TABLE "services" DROP COLUMN "features";
ALTER TABLE "services" DROP COLUMN "whatsIncluded";
ALTER TABLE "services" DROP COLUMN "process";
ALTER TABLE "services" DROP COLUMN "faqs";
ALTER TABLE "services" DROP COLUMN "testimonials";

-- sub_services
ALTER TABLE "sub_services" DROP COLUMN "gallery";
ALTER TABLE "sub_services" DROP COLUMN "features";
ALTER TABLE "sub_services" DROP COLUMN "whatsIncluded";
ALTER TABLE "sub_services" DROP COLUMN "process";
ALTER TABLE "sub_services" DROP COLUMN "faqs";
ALTER TABLE "sub_services" DROP COLUMN "seoTitle";
ALTER TABLE "sub_services" DROP COLUMN "metaDescription";
ALTER TABLE "sub_services" DROP COLUMN "metaKeywords";
ALTER TABLE "sub_services" DROP COLUMN "ogImage";
ALTER TABLE "sub_services" DROP COLUMN "canonicalUrl";
ALTER TABLE "sub_services" DROP COLUMN "structuredData";
