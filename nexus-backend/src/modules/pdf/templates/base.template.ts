import PDFDocument from 'pdfkit';
import type { CompanyBrandingData } from '../pdf.types';

type PDFDocumentInstance = InstanceType<typeof PDFDocument>;

const BRAND_PRIMARY = '#1a56db';
const BRAND_SECONDARY = '#6b7280';
const BRAND_BORDER = '#e5e7eb';
const BRAND_TEXT = '#111827';
const BRAND_LIGHT_BG = '#f9fafb';
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const MARGIN_TOP = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

export const BASE_TEMPLATE = {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  MARGIN_TOP,
  CONTENT_WIDTH,
  BRAND_PRIMARY,
  BRAND_SECONDARY,
  BRAND_BORDER,
  BRAND_TEXT,
  BRAND_LIGHT_BG,

  createDocument(): PDFDocumentInstance {
    return new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN_TOP, bottom: 60, left: MARGIN_LEFT, right: MARGIN_RIGHT },
      bufferPages: true,
      info: {
        Title: 'Nexus Document',
        Author: 'Nexus CRM',
        Creator: 'Nexus PDF Service',
      },
    });
  },

  drawHeader(doc: PDFDocumentInstance, branding: CompanyBrandingData) {
    let y = MARGIN_TOP;

    if (branding.logoUrl) {
      try {
        doc.image(branding.logoUrl, MARGIN_LEFT, y, { fit: [120, 50] });
      } catch {
        // Logo fetch failed; continue without it
      }
    }

    const companyX = branding.logoUrl ? MARGIN_LEFT + 130 : MARGIN_LEFT;
    doc.fontSize(16).font('Helvetica-Bold').fillColor(BRAND_TEXT);
    doc.text(branding.companyName || 'Nexus', companyX, y, { width: CONTENT_WIDTH - (branding.logoUrl ? 130 : 0) });

    y += 20;
    doc.fontSize(8).font('Helvetica').fillColor(BRAND_SECONDARY);
    const addressParts = [
      branding.addressLine1,
      branding.addressLine2,
      [branding.city, branding.state, branding.pincode].filter(Boolean).join(', '),
      branding.country,
    ].filter(Boolean);
    if (addressParts.length > 0) {
      doc.text(addressParts.join(', '), companyX, y, { width: 300 });
      y += Math.ceil(doc.heightOfString(addressParts.join(', '), { width: 300 })) + 2;
    }

    const contactParts = [
      branding.phone && `Ph: ${branding.phone}`,
      branding.email,
      branding.website,
    ].filter(Boolean);
    if (contactParts.length > 0) {
      doc.text(contactParts.join(' | '), companyX, y, { width: 300 });
      y += 14;
    }

    if (branding.gstNumber || branding.panNumber) {
      const taxParts = [branding.gstNumber && `GST: ${branding.gstNumber}`, branding.panNumber && `PAN: ${branding.panNumber}`].filter(Boolean);
      doc.text(taxParts.join('  |  '), companyX, y, { width: 300 });
      y += 14;
    }

    if (branding.legalBusinessName && branding.legalBusinessName !== branding.companyName) {
      doc.fontSize(7).fillColor(BRAND_SECONDARY);
      doc.text(`Legal Name: ${branding.legalBusinessName}`, companyX, y, { width: 300 });
      y += 12;
    }

    const headerBottom = Math.max(y, MARGIN_TOP + 55);
    doc.moveTo(MARGIN_LEFT, headerBottom + 5).lineTo(PAGE_WIDTH - MARGIN_RIGHT, headerBottom + 5).lineWidth(1).strokeColor(BRAND_BORDER).stroke();

    return headerBottom + 15;
  },

  drawDocumentTitle(doc: PDFDocumentInstance, title: string, documentNumber: string, y: number, meta?: string[]) {
    doc.fontSize(18).font('Helvetica-Bold').fillColor(BRAND_PRIMARY);
    doc.text(title, MARGIN_LEFT, y, { width: CONTENT_WIDTH });

    y += 22;
    doc.fontSize(10).font('Helvetica-Bold').fillColor(BRAND_TEXT);
    doc.text(documentNumber, MARGIN_LEFT, y, { width: CONTENT_WIDTH });

    if (meta && meta.length > 0) {
      y += 14;
      doc.fontSize(8).font('Helvetica').fillColor(BRAND_SECONDARY);
      doc.text(meta.join('  |  '), MARGIN_LEFT, y, { width: CONTENT_WIDTH });
      y += 12;
    }

    return y + 10;
  },

  drawRecipientBlock(doc: PDFDocumentInstance, label: string, recipient: { contactName: string; companyName?: string | null; email?: string | null; phone?: string | null }, y: number) {
    doc.fontSize(8).font('Helvetica-Bold').fillColor(BRAND_SECONDARY);
    doc.text(label, MARGIN_LEFT, y);

    y += 12;
    doc.fontSize(10).font('Helvetica-Bold').fillColor(BRAND_TEXT);
    doc.text(recipient.contactName, MARGIN_LEFT, y);

    if (recipient.companyName) {
      y += 13;
      doc.fontSize(9).font('Helvetica').fillColor(BRAND_TEXT);
      doc.text(recipient.companyName, MARGIN_LEFT, y);
    }

    const details: string[] = [];
    if (recipient.email) details.push(recipient.email);
    if (recipient.phone) details.push(recipient.phone);
    if (details.length > 0) {
      y += 13;
      doc.fontSize(8).font('Helvetica').fillColor(BRAND_SECONDARY);
      doc.text(details.join(' | '), MARGIN_LEFT, y);
    }

    return y + 14;
  },

  drawTable(doc: PDFDocumentInstance, headers: string[], rows: string[][], y: number, colWidths: number[]) {
    const rowHeight = 22;
    const headerHeight = 26;

    doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, headerHeight).fill(BRAND_PRIMARY);
    let x = MARGIN_LEFT + 5;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
    headers.forEach((h, i) => {
      const align = i === 0 ? 'left' : 'right';
      doc.text(h, x, y + 8, { width: colWidths[i] - 10, align: align as 'left' | 'right' });
      x += colWidths[i];
    });

    y += headerHeight;

    for (let r = 0; r < rows.length; r++) {
      if (y + rowHeight > PAGE_HEIGHT - 100) {
        doc.addPage();
        y = MARGIN_TOP + 10;

        doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, headerHeight).fill(BRAND_PRIMARY);
        x = MARGIN_LEFT + 5;
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
        headers.forEach((h, i) => {
          const align = i === 0 ? 'left' : 'right';
          doc.text(h, x, y + 8, { width: colWidths[i] - 10, align: align as 'left' | 'right' });
          x += colWidths[i];
        });
        y += headerHeight;
      }

      const bgColor = r % 2 === 0 ? '#ffffff' : BRAND_LIGHT_BG;
      doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, rowHeight).fill(bgColor);

      x = MARGIN_LEFT + 5;
      doc.fontSize(8).font('Helvetica').fillColor(BRAND_TEXT);
      rows[r].forEach((cell, i) => {
        const align = i === 0 ? 'left' : 'right';
        doc.text(cell, x, y + 6, { width: colWidths[i] - 10, align: align as 'left' | 'right' });
        x += colWidths[i];
      });

      y += rowHeight;
    }

    return y;
  },

  drawTotals(doc: PDFDocumentInstance, totals: { label: string; value: string; bold?: boolean }[], y: number) {
    const totalsWidth = 220;
    const totalsX = PAGE_WIDTH - MARGIN_RIGHT - totalsWidth;

    for (const t of totals) {
      if (t.bold) {
        doc.rect(totalsX - 5, y - 2, totalsWidth + 10, 22).fill(BRAND_PRIMARY);
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff');
      } else {
        doc.fontSize(9).font('Helvetica').fillColor(BRAND_TEXT);
      }
      doc.text(t.label, totalsX, y + 3, { width: 120, align: 'left' });
      doc.text(t.value, totalsX + 120, y + 3, { width: 90, align: 'right' });
      y += t.bold ? 24 : 18;
    }

    return y;
  },

  drawBankDetails(doc: PDFDocumentInstance, branding: CompanyBrandingData, y: number) {
    const hasBankDetails = branding.bankName || branding.accountNumber || branding.ifsc;
    const hasUpi = branding.upiId || branding.qrCodeUrl;

    if (!hasBankDetails && !hasUpi) return y;

    y += 10;
    doc.moveTo(MARGIN_LEFT, y).lineTo(PAGE_WIDTH - MARGIN_RIGHT, y).lineWidth(0.5).strokeColor(BRAND_BORDER).stroke();
    y += 8;

    doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND_PRIMARY);
    doc.text('Payment Details', MARGIN_LEFT, y);
    y += 14;

    doc.fontSize(8).font('Helvetica').fillColor(BRAND_TEXT);
    if (branding.bankName) {
      doc.text(`Bank: ${branding.bankName}`, MARGIN_LEFT, y);
      y += 12;
    }
    if (branding.accountHolder) {
      doc.text(`Account Holder: ${branding.accountHolder}`, MARGIN_LEFT, y);
      y += 12;
    }
    if (branding.accountNumber) {
      doc.text(`Account No: ${branding.accountNumber}`, MARGIN_LEFT, y);
      y += 12;
    }
    if (branding.ifsc) {
      doc.text(`IFSC: ${branding.ifsc}`, MARGIN_LEFT, y);
      y += 12;
    }
    if (branding.branch) {
      doc.text(`Branch: ${branding.branch}`, MARGIN_LEFT, y);
      y += 12;
    }
    if (branding.upiId) {
      doc.text(`UPI: ${branding.upiId}`, MARGIN_LEFT, y);
      y += 12;
    }

    if (branding.qrCodeUrl) {
      try {
        doc.image(branding.qrCodeUrl, MARGIN_LEFT, y, { fit: [80, 80] });
        y += 90;
      } catch {
        // QR code fetch failed
      }
    }

    return y;
  },

  drawSignatureAndStamp(doc: PDFDocumentInstance, branding: CompanyBrandingData, y: number) {
    const signatureWidth = 120;
    const stampWidth = 80;

    if (branding.companySignatureUrl || branding.companyStampUrl) {
      y += 10;
      if (y + 80 > PAGE_HEIGHT - 100) {
        doc.addPage();
        y = MARGIN_TOP + 10;
      }

      if (branding.companySignatureUrl) {
        try {
          doc.fontSize(8).font('Helvetica').fillColor(BRAND_SECONDARY);
          doc.text('Authorized Signature', MARGIN_LEFT, y);
          y += 12;
          doc.image(branding.companySignatureUrl, MARGIN_LEFT, y, { fit: [signatureWidth, 40] });
        } catch {
          // Signature fetch failed
        }
      }

      if (branding.companyStampUrl) {
        try {
          const stampX = PAGE_WIDTH - MARGIN_RIGHT - stampWidth;
          doc.image(branding.companyStampUrl, stampX, y - 20, { fit: [stampWidth, 60] });
        } catch {
          // Stamp fetch failed
        }
      }

      y += 60;
    }

    return y;
  },

  drawFooter(doc: PDFDocumentInstance, branding: CompanyBrandingData) {
    const footerY = PAGE_HEIGHT - 50;
    const pageCount = doc.bufferedPageRange().count;
    const lastPageIndex = pageCount - 1;
    const footerLeft = [branding.companyName, branding.phone, branding.email].filter(Boolean).join(' | ');

    // Temporarily remove bottom margin so PDFKit's maxY() covers the footer
    // area. Without this, doc.text() at footerY (below the margin boundary)
    // triggers an implicit addPage(), producing a trailing blank page.
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      doc.fontSize(7).font('Helvetica').fillColor(BRAND_SECONDARY);

      if (i === lastPageIndex && footerLeft) {
        doc.moveTo(MARGIN_LEFT, footerY - 5).lineTo(PAGE_WIDTH - MARGIN_RIGHT, footerY - 5).lineWidth(0.5).strokeColor(BRAND_BORDER).stroke();
        doc.text(footerLeft, MARGIN_LEFT, footerY, { width: CONTENT_WIDTH / 2 });
      }

      doc.fontSize(7).font('Helvetica').fillColor(BRAND_SECONDARY);
      doc.text(`Page ${i + 1} of ${pageCount}`, MARGIN_LEFT, footerY, {
        width: CONTENT_WIDTH,
        align: 'center',
      });
    }

    doc.page.margins.bottom = originalBottomMargin;
  },

  addPageNumber(doc: PDFDocumentInstance) {
    doc.on('pageAdded', () => {
      // Page numbers are drawn in drawFooter via bufferedPageRange
    });
  },

  drawAmountInWords(doc: PDFDocumentInstance, amount: number, currency: string, y: number) {
    const words = numberToWords(amount);
    if (words) {
      doc.fontSize(8).font('Helvetica-Oblique').fillColor(BRAND_SECONDARY);
      doc.text(`Amount in words: ${currency} ${words}`, MARGIN_LEFT, y, { width: CONTENT_WIDTH });
      y += 14;
    }
    return y;
  },

  drawWatermark(doc: PDFDocumentInstance, text: string, color = '#dc2626') {
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.save();
      doc.rotate(-45, { origin: [PAGE_WIDTH / 2, PAGE_HEIGHT / 2] });
      doc.fontSize(60).font('Helvetica-Bold').fillColor(color).opacity(0.08);
      doc.text(text, PAGE_WIDTH / 2 - 160, PAGE_HEIGHT / 2 - 40, {
        width: 320,
        align: 'center',
      } as any);
      doc.restore();
    }
  },
};

function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  let result = '';

  if (intPart >= 10000000) {
    result += ones[Math.floor(intPart / 10000000)] + ' Crore ';
  }
  if (intPart >= 100000) {
    const lakhs = Math.floor((intPart % 10000000) / 100000);
    if (lakhs > 0) result += (lakhs >= 20 ? tens[Math.floor(lakhs / 10)] + ' ' + ones[lakhs % 10] : ones[lakhs]) + ' Lakh ';
  }
  if (intPart >= 1000) {
    const thousands = Math.floor((intPart % 100000) / 1000);
    if (thousands > 0) result += (thousands >= 20 ? tens[Math.floor(thousands / 10)] + ' ' + ones[thousands % 10] : ones[thousands]) + ' Thousand ';
  }
  if (intPart >= 100) {
    const hundreds = Math.floor((intPart % 1000) / 100);
    if (hundreds > 0) result += ones[hundreds] + ' Hundred ';
  }
  const remainder = intPart % 100;
  if (remainder > 0) {
    if (remainder < 20) {
      result += ones[remainder];
    } else {
      result += tens[Math.floor(remainder / 10)];
      if (remainder % 10 > 0) result += ' ' + ones[remainder % 10];
    }
  }

  result = result.trim();
  if (decPart > 0) {
    const decOnes = decPart % 10;
    const decTens = Math.floor(decPart / 10);
    let decWords = '';
    if (decTens > 0) decWords += tens[decTens];
    if (decOnes > 0) decWords += (decWords ? ' ' : '') + ones[decOnes];
    result += ` and ${decWords} Paise`;
  }

  return result + ' Only';
}

export function formatCurrency(amount: number, symbol = '₹'): string {
  const formatted = amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol} ${formatted}`;
}

export function formatDate(date: Date, format = 'dd/MM/yyyy'): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (format === 'dd/MM/yyyy') return `${day}/${month}/${year}`;
  if (format === 'MM/dd/yyyy') return `${month}/${day}/${year}`;
  if (format === 'yyyy-MM-dd') return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`;
}
