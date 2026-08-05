-- Problem 3 (Professional Quotation & Invoice Builder): line-item unit.
--
-- Quotation and Invoice lines gain a measurement unit (None, Nos, PCS, Sq Ft,
-- Meter, Job, ...) so a line reads "Tiles / 150 / Sq Ft / Rs 80" instead of a
-- bare quantity. Both tables get the same defaulted column so existing rows
-- stay valid ("None") and new lines store the admin-selected unit.

ALTER TABLE "quotation_items" ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'None';
ALTER TABLE "invoice_items" ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'None';
