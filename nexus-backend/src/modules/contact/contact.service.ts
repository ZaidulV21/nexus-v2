import { contactMessageRepository } from './contact.repository';
import {
  CreateContactMessageInput,
  ContactMessageListFilters,
  ReplyContactMessageInput,
} from './contact.types';
import { NotFoundError, ValidationError } from '../../core/errors/AppError';
import { PaginationParams } from '../../core/utils/pagination';
import { emailService } from '../email/email.service';
import { companyService } from '../company/company.service';
import { renderContactReplyEmail } from '../email/templates/contact-reply.template';
import type { EmailBranding } from '../email/templates/base-email.template';

async function getBranding(): Promise<EmailBranding> {
  try {
    const settings = await companyService.get();
    return {
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
      replyToEmail: settings.replyToEmail ?? undefined,
    };
  } catch {
    return {};
  }
}

export const contactMessageService = {
  // Public entry point - stores the message in the Support inbox. Never
  // creates a Lead or Client; the admin converts it if a real opportunity
  // emerges.
  async submit(input: CreateContactMessageInput) {
    return contactMessageRepository.create(input);
  },

  async list(pagination: PaginationParams, filters: ContactMessageListFilters = {}) {
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 20;
    return contactMessageRepository.list({ page, pageSize }, filters);
  },

  async getById(id: string) {
    const message = await contactMessageRepository.findById(id);
    if (!message) throw new NotFoundError('Message not found');
    return message;
  },

  async markRead(id: string) {
    const message = await contactMessageRepository.findById(id);
    if (!message) throw new NotFoundError('Message not found');
    if (message.status === 'NEW') {
      return contactMessageRepository.markRead(id);
    }
    return message;
  },

  // Admin replies from the inbox. The reply is stored on the record and
  // emailed to the visitor; the "reply-to" is pinned to the company's
  // configured support mailbox so any visitor response lands in the shared
  // inbox instead of a personal account.
  async reply(id: string, input: ReplyContactMessageInput, actorUserId?: string) {
    const message = await contactMessageRepository.findById(id);
    if (!message) throw new NotFoundError('Message not found');
    if (message.status === 'ARCHIVED') {
      throw new ValidationError('Archived messages cannot be replied to - restore the message first');
    }

    const branding = await getBranding();
    const html = renderContactReplyEmail(
      {
        name: message.name,
        subject: message.subject,
        replyBody: input.body,
        originalMessage: message.message,
      },
      branding,
    );

    // replyTo is deliberately the company's support/reply-to mailbox (never
    // the admin's own address) so the visitor's response is tracked centrally.
    const replyTo = branding.replyToEmail || branding.supportEmail || undefined;
    await emailService.send({
      to: message.email,
      subject: `Re: ${message.subject}`,
      html,
      replyTo,
    });

    const updated = await contactMessageRepository.markReplied(id, input.body, actorUserId ?? '');
    return updated;
  },

  async archive(id: string) {
    const message = await contactMessageRepository.findById(id);
    if (!message) throw new NotFoundError('Message not found');
    return contactMessageRepository.archive(id);
  },

  async restore(id: string) {
    const message = await contactMessageRepository.findById(id);
    if (!message) throw new NotFoundError('Message not found');
    return contactMessageRepository.restore(id);
  },

  async counts() {
    return contactMessageRepository.counts();
  },
};
