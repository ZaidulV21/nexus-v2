import { Prisma } from '@prisma/client';

// Deliberately isolated from every other counter in the system (e.g. Lead/
// Project/Quotation numbering) because this one carries GST legal weight:
// numbers must be sequential per financial year with zero gaps, even under
// concurrent invoice creation. Uses a row-level lock inside the caller's
// transaction so two concurrent requests can never receive the same number.
function currentFinancialYear(date: Date): string {
  // Indian financial year: April 1 - March 31
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed, April = 3
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  return `${startYear}-${String(endYear).slice(-2)}`;
}

export const invoiceNumberingService = {
  async getNextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
    const financialYear = currentFinancialYear(new Date());

    // Row-level lock via raw SQL to guarantee no two concurrent transactions
    // read-then-write the same counter value.
    await tx.$executeRaw`
      INSERT INTO invoice_number_sequences (id, "financialYear", "lastNumber")
      VALUES (gen_random_uuid(), ${financialYear}, 0)
      ON CONFLICT ("financialYear") DO NOTHING
    `;

    const rows = await tx.$queryRaw<{ id: string; lastNumber: number }[]>`
      SELECT id, "lastNumber" FROM invoice_number_sequences
      WHERE "financialYear" = ${financialYear}
      FOR UPDATE
    `;

    const current = rows[0];
    const nextNumber = current.lastNumber + 1;

    await tx.invoiceNumberSequence.update({
      where: { id: current.id },
      data: { lastNumber: nextNumber },
    });

    return `INV/${financialYear}/${String(nextNumber).padStart(5, '0')}`;
  },
};
