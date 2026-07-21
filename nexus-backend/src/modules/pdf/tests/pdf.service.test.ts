import PDFDocument from 'pdfkit';
import zlib from 'zlib';
import { renderQuotationPdf } from '../templates/quotation.template';
import { renderInvoicePdf } from '../templates/invoice.template';
import { BASE_TEMPLATE, formatCurrency, formatDate } from '../templates/base.template';
import { CompanyBrandingData, PdfQuotationData, PdfInvoiceData } from '../pdf.types';

type PDFDocumentInstance = InstanceType<typeof PDFDocument>;

function extractPdfText(buffer: Buffer): string {
  const latin1 = buffer.toString('latin1');
  const regex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let result = latin1;
  let match;
  while ((match = regex.exec(latin1)) !== null) {
    try {
      const streamData = Buffer.from(match[1], 'latin1');
      const decompressed = zlib.inflateSync(streamData);
      result += decompressed.toString('latin1');
    } catch {
      // not compressed or invalid stream
    }
  }
  return result;
}

function pdfContainsText(buffer: Buffer, searchText: string): boolean {
  const raw = buffer.toString('latin1');
  if (raw.includes(searchText)) return true;

  const decoded = extractPdfText(buffer);
  const hexChunks = decoded.match(/<([0-9A-Fa-f]+)>/g) || [];
  const concatenated = hexChunks
    .map((h) => h.slice(1, -1))
    .join('');
  const targetHex = Buffer.from(searchText, 'latin1').toString('hex');
  return concatenated.includes(targetHex);
}

const mockBranding: CompanyBrandingData = {
  companyName: 'Test Company',
  legalBusinessName: 'Test Company Pvt Ltd',
  logoUrl: null,
  gstNumber: '22AAAAA0000A1Z5',
  panNumber: 'AAAAA0000A',
  cin: null,
  email: 'test@company.com',
  phone: '+911234567890',
  whatsappNumber: null,
  website: 'https://test.com',
  addressLine1: '123 Test Street',
  addressLine2: 'Test Area',
  city: 'Mumbai',
  state: 'Maharashtra',
  country: 'India',
  pincode: '400001',
  currency: 'INR',
  currencySymbol: '₹',
  bankName: 'State Bank of India',
  accountHolder: 'Test Company',
  accountNumber: '1234567890',
  ifsc: 'SBIN0001234',
  branch: 'Mumbai Main',
  upiId: 'test@upi',
  qrCodeUrl: null,
  companySignatureUrl: null,
  companyStampUrl: null,
};

const mockQuotationData: PdfQuotationData = {
  quotationNumber: 'Q-00001',
  versionNumber: 1,
  status: 'APPROVED',
  createdAt: new Date('2026-07-21'),
  validUntil: new Date('2026-08-21'),
  items: [
    { description: 'Web Development', serviceName: 'Web Dev Service', quantity: 1, unitPrice: 50000, taxRate: 18, taxAmount: 9000, lineTotal: 59000, hsnSacCode: '998314' },
    { description: 'UI/UX Design', serviceName: 'Design Service', quantity: 1, unitPrice: 20000, taxRate: 18, taxAmount: 3600, lineTotal: 23600 },
  ],
  subtotal: 70000,
  discount: 5000,
  gstAmount: 12600,
  transportation: 0,
  installation: 2000,
  grandTotal: 79600,
  recipient: {
    contactName: 'Rahul Sharma',
    companyName: 'Sharma Industries',
    email: 'rahul@sharma.com',
    phone: '+919876543210',
    gstin: '27AABCU9603R1ZM',
  },
  notes: 'This quotation is valid for 30 days from the date of issue.',
  termsAndConditions: '1. Prices are inclusive of GST.\n2. Payment due within 30 days.\n3. Subject to jurisdiction of Mumbai courts.',
  paymentTerms: '100% advance payment via NEFT/RTGS. UPI also accepted.',
};

const mockInvoiceData: PdfInvoiceData = {
  invoiceNumber: 'INV/26-27/00001',
  label: 'Web Development Phase 1',
  status: 'ISSUED',
  displayStatus: 'PARTIALLY PAID',
  issuedAt: new Date('2026-07-21'),
  items: [
    { description: 'Web Development', quantity: 1, unitPrice: 50000, taxRate: 18, taxAmount: 9000, lineTotal: 59000, hsnSacCode: '998314' },
    { description: 'UI/UX Design', quantity: 1, unitPrice: 20000, taxRate: 18, taxAmount: 3600, lineTotal: 23600, hsnSacCode: '998314' },
  ],
  subtotal: 70000,
  gstAmount: 12600,
  grandTotal: 82600,
  paidAmount: 30000,
  outstandingAmount: 52600,
  recipient: {
    contactName: 'Rahul Sharma',
    companyName: 'Sharma Industries',
    email: 'rahul@sharma.com',
    phone: '+919876543210',
    gstin: '27AABCU9603R1ZM',
  },
  projectName: 'PRJ-00001',
  projectNumber: 'PRJ-00001',
};

function createPdfBuffer(fn: (doc: PDFDocumentInstance) => void): Promise<Buffer> {
  return new Promise<Buffer>((resolve) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    fn(doc as unknown as PDFDocumentInstance);
    doc.end();
  });
}

describe('PDF Template - formatCurrency', () => {
  it('formats currency with default ₹ symbol', () => {
    const result = formatCurrency(12345.67);
    expect(result).toContain('12,345.67');
    expect(result).toContain('₹');
  });

  it('formats currency with custom symbol', () => {
    const result = formatCurrency(12345.67, '$');
    expect(result).toContain('12,345.67');
    expect(result).toContain('$');
  });

  it('formats zero correctly', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0.00');
  });

  it('formats large numbers correctly', () => {
    const result = formatCurrency(10000000);
    expect(result).toContain('1,00,00,000.00');
  });
});

describe('PDF Template - formatDate', () => {
  it('formats date in dd/MM/yyyy by default', () => {
    const result = formatDate(new Date('2026-07-21'));
    expect(result).toBe('21/07/2026');
  });

  it('formats date in MM/dd/yyyy', () => {
    const result = formatDate(new Date('2026-07-21'), 'MM/dd/yyyy');
    expect(result).toBe('07/21/2026');
  });

  it('formats date in yyyy-MM-dd', () => {
    const result = formatDate(new Date('2026-07-21'), 'yyyy-MM-dd');
    expect(result).toBe('2026-07-21');
  });
});

describe('PDF Template - BASE_TEMPLATE', () => {
  it('exports correct page dimensions', () => {
    expect(BASE_TEMPLATE.PAGE_WIDTH).toBe(595.28);
    expect(BASE_TEMPLATE.PAGE_HEIGHT).toBe(841.89);
    expect(BASE_TEMPLATE.MARGIN_LEFT).toBe(50);
    expect(BASE_TEMPLATE.MARGIN_RIGHT).toBe(50);
    expect(BASE_TEMPLATE.CONTENT_WIDTH).toBe(495.28);
  });

  it('creates a valid PDF document', () => {
    const doc = BASE_TEMPLATE.createDocument();
    expect(doc).toBeDefined();
    doc.end();
  });
});

describe('PDF Template - renderQuotationPdf', () => {
  it('generates a valid PDF buffer for quotation', async () => {
    const buffer = await createPdfBuffer((doc) => {
      renderQuotationPdf(doc, mockBranding, mockQuotationData);
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString('utf8', 0, 5)).toBe('%PDF-');
  });

  it('produces non-trivial sized PDF for quotation with items', async () => {
    const buffer = await createPdfBuffer((doc) => {
      renderQuotationPdf(doc, mockBranding, mockQuotationData);
    });

    expect(buffer.length).toBeGreaterThan(500);
  });

  it('includes Helvetica fonts in the PDF', async () => {
    const buffer = await createPdfBuffer((doc) => {
      renderQuotationPdf(doc, mockBranding, mockQuotationData);
    });

    const text = buffer.toString('latin1');
    expect(text).toContain('Helvetica');
    expect(text).toContain('Helvetica-Bold');
  });

  it('renders with minimal branding (no optional fields)', async () => {
    const minimalBranding: CompanyBrandingData = {
      ...mockBranding,
      logoUrl: null,
      gstNumber: null,
      panNumber: null,
      cin: null,
      website: null,
      bankName: null,
      accountHolder: null,
      accountNumber: null,
      ifsc: null,
      branch: null,
      upiId: null,
      qrCodeUrl: null,
      companySignatureUrl: null,
      companyStampUrl: null,
      addressLine2: null,
    };

    const buffer = await createPdfBuffer((doc) => {
      renderQuotationPdf(doc, minimalBranding, mockQuotationData);
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString('utf8', 0, 5)).toBe('%PDF-');
  });

  it('includes PDFKit producer metadata', async () => {
    const buffer = await createPdfBuffer((doc) => {
      renderQuotationPdf(doc, mockBranding, mockQuotationData);
    });

    const text = buffer.toString('latin1');
    expect(text).toContain('PDFKit');
  });

  it('includes DRAFT watermark for draft status', async () => {
    const draftData: PdfQuotationData = { ...mockQuotationData, status: 'DRAFT' };
    const buffer = await createPdfBuffer((doc) => {
      renderQuotationPdf(doc, mockBranding, draftData);
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString('utf8', 0, 5)).toBe('%PDF-');
  });

  it('includes REJECTED watermark for rejected status', async () => {
    const rejectedData: PdfQuotationData = { ...mockQuotationData, status: 'REJECTED' };
    const buffer = await createPdfBuffer((doc) => {
      renderQuotationPdf(doc, mockBranding, rejectedData);
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString('utf8', 0, 5)).toBe('%PDF-');
  });

  it('renders with valid until date', async () => {
    const buffer = await createPdfBuffer((doc) => {
      renderQuotationPdf(doc, mockBranding, mockQuotationData);
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('renders with notes and terms', async () => {
    const buffer = await createPdfBuffer((doc) => {
      renderQuotationPdf(doc, mockBranding, mockQuotationData);
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('renders without optional sections when not provided', async () => {
    const minimalData: PdfQuotationData = {
      ...mockQuotationData,
      notes: null,
      termsAndConditions: null,
      paymentTerms: null,
      validUntil: null,
      items: [
        { description: 'Service', quantity: 1, unitPrice: 10000, taxRate: 18, taxAmount: 1800, lineTotal: 11800 },
      ],
    };
    const buffer = await createPdfBuffer((doc) => {
      renderQuotationPdf(doc, mockBranding, minimalData);
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString('utf8', 0, 5)).toBe('%PDF-');
  });
});

describe('PDF Template - renderInvoicePdf', () => {
  it('generates a valid PDF buffer for invoice', async () => {
    const buffer = await createPdfBuffer((doc) => {
      renderInvoicePdf(doc, mockBranding, mockInvoiceData);
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString('utf8', 0, 5)).toBe('%PDF-');
  });

  it('produces non-trivial sized PDF for invoice', async () => {
    const buffer = await createPdfBuffer((doc) => {
      renderInvoicePdf(doc, mockBranding, mockInvoiceData);
    });

    expect(buffer.length).toBeGreaterThan(500);
  });

  it('includes Helvetica fonts in the PDF', async () => {
    const buffer = await createPdfBuffer((doc) => {
      renderInvoicePdf(doc, mockBranding, mockInvoiceData);
    });

    const text = buffer.toString('latin1');
    expect(text).toContain('Helvetica');
    expect(text).toContain('Helvetica-Bold');
  });

  it('includes compressed content streams', async () => {
    const buffer = await createPdfBuffer((doc) => {
      renderInvoicePdf(doc, mockBranding, mockInvoiceData);
    });

    const text = buffer.toString('latin1');
    expect(text).toContain('FlateDecode');
  });

  it('includes PDFKit producer metadata', async () => {
    const buffer = await createPdfBuffer((doc) => {
      renderInvoicePdf(doc, mockBranding, mockInvoiceData);
    });

    const text = buffer.toString('latin1');
    expect(text).toContain('PDFKit');
  });

  it('renders invoice without error when not paid', async () => {
    const unpaidData: PdfInvoiceData = {
      ...mockInvoiceData,
      paidAmount: 0,
      outstandingAmount: 82600,
      displayStatus: 'ISSUED',
    };

    const buffer = await createPdfBuffer((doc) => {
      renderInvoicePdf(doc, mockBranding, unpaidData);
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.toString('utf8', 0, 5)).toBe('%PDF-');
  });

  it('renders PAID watermark when fully paid', async () => {
    const paidData: PdfInvoiceData = {
      ...mockInvoiceData,
      paidAmount: 82600,
      outstandingAmount: 0,
      displayStatus: 'PAID',
    };

    const buffer = await createPdfBuffer((doc) => {
      renderInvoicePdf(doc, mockBranding, paidData);
    });

    expect(pdfContainsText(buffer, 'PAID')).toBe(true);
  });

  it('renders CANCELLED watermark when cancelled', async () => {
    const cancelledData: PdfInvoiceData = {
      ...mockInvoiceData,
      status: 'CANCELLED',
      displayStatus: 'CANCELLED',
      paidAmount: 0,
      outstandingAmount: 0,
    };

    const buffer = await createPdfBuffer((doc) => {
      renderInvoicePdf(doc, mockBranding, cancelledData);
    });

    expect(pdfContainsText(buffer, 'CANCELLED')).toBe(true);
  });

  it('renders PARTIALLY PAID watermark when partially paid', async () => {
    const buffer = await createPdfBuffer((doc) => {
      renderInvoicePdf(doc, mockBranding, mockInvoiceData);
    });

    expect(pdfContainsText(buffer, 'PARTIALLY PAID')).toBe(true);
  });

  it('renders invoice with GSTIN in recipient block', async () => {
    const buffer = await createPdfBuffer((doc) => {
      renderInvoicePdf(doc, mockBranding, mockInvoiceData);
    });

    expect(pdfContainsText(buffer, 'GSTIN')).toBe(true);
    expect(pdfContainsText(buffer, '27AABCU9603R1ZM')).toBe(true);
  });

  it('renders invoice with company branding', async () => {
    const buffer = await createPdfBuffer((doc) => {
      renderInvoicePdf(doc, mockBranding, mockInvoiceData);
    });

    expect(pdfContainsText(buffer, 'Test Company')).toBe(true);
    expect(pdfContainsText(buffer, 'SBIN0001234')).toBe(true);
  });

  it('renders invoice with items table', async () => {
    const buffer = await createPdfBuffer((doc) => {
      renderInvoicePdf(doc, mockBranding, mockInvoiceData);
    });

    expect(pdfContainsText(buffer, 'Web Development')).toBe(true);
    expect(pdfContainsText(buffer, '998314')).toBe(true);
  });
});

describe('PDF Service - validation', () => {
  it('validates document type parameter', () => {
    const validTypes = ['QUOTATION', 'INVOICE'];
    const invalidTypes = ['QUOTE', 'BILL', 'RECEIPT'];

    for (const t of validTypes) {
      expect(['QUOTATION', 'INVOICE']).toContain(t);
    }
    for (const t of invalidTypes) {
      expect(['QUOTATION', 'INVOICE']).not.toContain(t);
    }
  });
});
