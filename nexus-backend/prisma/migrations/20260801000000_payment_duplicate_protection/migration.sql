-- Payment concurrency & duplicate protection:
--  * Online (Razorpay) payments are idempotent at the database level - one
--    gateway transaction can never produce more than one Payment record,
--    even when two verification requests race past the application-level
--    pre-check in payments.service.ts.
--  * Manual (offline) transaction references get the same guarantee, matching
--    the duplicate check already enforced in invoice.service.ts.
--  * Both columns are nullable; PostgreSQL UNIQUE indexes allow multiple
--    NULLs, so offline payments recorded without a reference are unaffected.

CREATE UNIQUE INDEX "payments_gatewayTransactionId_key"
  ON "payments"("gatewayTransactionId");

CREATE UNIQUE INDEX "payments_transactionReference_key"
  ON "payments"("transactionReference");
