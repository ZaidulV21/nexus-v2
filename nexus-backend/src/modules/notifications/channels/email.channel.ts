import { NotificationChannel, ChannelSendResult } from './channel.interface';
import { companyService } from '../../company/company.service';
import { emailService } from '../../email/email.service';
import { env } from '../../../config/env';
import { renderQuotationSentEmail } from '../../email/templates/quotation-sent.template';
import { renderInvoiceSentEmail } from '../../email/templates/invoice-sent.template';
import { renderPaymentReceiptEmail } from '../../email/templates/payment-receipt.template';
import { renderClientWelcomeEmail } from '../../email/templates/client-welcome.template';
import type { EmailBranding } from '../../email/templates/base-email.template';

export const emailChannel: NotificationChannel = {
  name: 'EMAIL',
  async send(recipient: string, payload: Record<string, unknown>): Promise<ChannelSendResult> {
    let branding: EmailBranding = {};
    try {
      const settings = await companyService.get();
      branding = {
        companyName: settings.companyName ?? undefined,
        logoUrl: settings.logoUrl ?? undefined,
        supportEmail: settings.supportEmail ?? undefined,
        phone: settings.phone ?? undefined,
        addressLine1: settings.addressLine1 ?? undefined,
        addressLine2: settings.addressLine2 ?? undefined,
        city: settings.city ?? undefined,
        state: settings.state ?? undefined,
        country: settings.country ?? undefined,
        pincode: settings.pincode ?? undefined,
      };
    } catch {
      // Non-critical: proceed without branding if settings fetch fails
    }

    const appUrl = env.appUrl || 'http://localhost:5173';

    const subject = buildSubject(payload);
    const html = buildHtml(payload, branding, appUrl);

    if (!subject || !html) {
      return { status: 'SKIPPED', reason: `No email template matched for payload keys: ${Object.keys(payload).join(', ')}` };
    }

    // emailService.send resolves to { id } only when the provider accepted the
    // email; it resolves to null when delivery is unavailable (e.g. no API key
    // configured). Surface that truthfully so the caller never records a false
    // "Sent" for an email that was never sent.
    const result = await emailService.send({
      to: recipient,
      subject,
      html,
      replyTo: branding.supportEmail || undefined,
    });

    if (!result?.id) {
      return { status: 'SKIPPED', reason: 'Email provider did not accept the message (no API key or send failed)' };
    }

    return { status: 'SENT', messageId: result.id };
  },
};

function buildSubject(payload: Record<string, unknown>): string | null {
  const quotationNumber = payload.quotationNumber as string | undefined;
  const invoiceNumber = payload.invoiceNumber as string | undefined;
  const isResent = Boolean(payload.resend);

  if (quotationNumber) {
    return `${isResent ? 'Revised Quotation' : 'New Quotation'} — ${quotationNumber}`;
  }
  if (payload.amount !== undefined && payload.invoiceNumber) {
    return `Payment Receipt — ${payload.invoiceNumber}`;
  }
  if (invoiceNumber) {
    return `${isResent ? 'Invoice Reminder' : 'New Invoice'} — ${invoiceNumber}`;
  }
  if (payload.clientName && payload.loginEmail && !payload.tempPassword) {
    const companyName = 'Nexus';
    return `Welcome to ${companyName} Client Portal`;
  }
  return null;
}

function buildHtml(
  payload: Record<string, unknown>,
  branding: EmailBranding,
  appUrl: string
): string | null {
  const quotationNumber = payload.quotationNumber as string | undefined;
  const invoiceNumber = payload.invoiceNumber as string | undefined;
  const clientName = (payload.clientName as string) || 'there';

  if (quotationNumber) {
    return renderQuotationSentEmail(
      {
        clientName,
        quotationNumber,
        grandTotal: Number(payload.grandTotal) || 0,
        subtotal: Number(payload.subtotal) || 0,
        gstAmount: Number(payload.gstAmount) || 0,
        currency: payload.currency as string | undefined,
        portalUrl: `${appUrl}/portal/quotations/${payload.quotationId || ''}`,
        resend: Boolean(payload.resend),
        serviceNames: Array.isArray(payload.serviceNames) ? payload.serviceNames as string[] : undefined,
      },
      branding
    );
  }

  if (invoiceNumber) {
    const isReceipt = payload.amount !== undefined && payload.paymentId !== undefined;

    if (isReceipt) {
      return renderPaymentReceiptEmail(
        {
          clientName,
          invoiceNumber,
          amount: Number(payload.amount) || 0,
          currency: payload.currency as string | undefined,
          paymentDate: payload.paymentDate as string | undefined,
          paymentMethod: payload.paymentMethod as string | undefined,
          portalUrl: `${appUrl}/portal/invoices/${payload.invoiceId || ''}`,
        },
        branding
      );
    }

    return renderInvoiceSentEmail(
      {
        clientName,
        invoiceNumber,
        grandTotal: Number(payload.grandTotal) || 0,
        currency: payload.currency as string | undefined,
        portalUrl: `${appUrl}/portal/invoices/${payload.invoiceId || ''}`,
        resend: Boolean(payload.resend),
        outstandingAmount: payload.outstandingAmount as number | undefined,
        dueDate: payload.dueDate as string | undefined,
      },
      branding
    );
  }

  if (payload.clientName && payload.loginEmail && !payload.tempPassword) {
    return renderClientWelcomeEmail(
      {
        clientName: (payload.clientName as string) || 'there',
        loginEmail: payload.loginEmail as string,
        portalUrl: `${appUrl}/portal`,
      },
      branding
    );
  }

  return null;
}
