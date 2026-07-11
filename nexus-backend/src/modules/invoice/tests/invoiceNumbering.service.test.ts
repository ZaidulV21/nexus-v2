import { invoiceNumberingService } from '../invoiceNumbering.service';

function mockTx(lastNumber: number) {
  return {
    $executeRaw: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'seq1', lastNumber }]),
    invoiceNumberSequence: { update: jest.fn().mockResolvedValue({}) },
  } as any;
}

describe('invoiceNumberingService.getNextInvoiceNumber', () => {
  it('increments from the current lastNumber and formats INV/<FY>/<padded>', async () => {
    const tx = mockTx(4);
    const number = await invoiceNumberingService.getNextInvoiceNumber(tx);
    expect(number).toMatch(/^INV\/\d{4}-\d{2}\/00005$/);
    expect(tx.invoiceNumberSequence.update).toHaveBeenCalledWith({
      where: { id: 'seq1' },
      data: { lastNumber: 5 },
    });
  });

  it('starts at 1 for a fresh financial year sequence', async () => {
    const tx = mockTx(0);
    const number = await invoiceNumberingService.getNextInvoiceNumber(tx);
    expect(number).toMatch(/00001$/);
  });

  it('uses SELECT ... FOR UPDATE to lock the sequence row (concurrency safety)', async () => {
    const tx = mockTx(0);
    await invoiceNumberingService.getNextInvoiceNumber(tx);
    const rawQueryText = (tx.$queryRaw as jest.Mock).mock.calls[0][0].join('');
    expect(rawQueryText).toContain('FOR UPDATE');
  });
});
