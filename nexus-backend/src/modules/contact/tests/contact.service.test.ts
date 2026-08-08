jest.mock('../contact.repository', () => ({
  contactMessageRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    markRead: jest.fn(),
    markReplied: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
    list: jest.fn(),
    counts: jest.fn(),
  },
}));
jest.mock('../../company/company.service', () => ({
  companyService: { get: jest.fn() },
}));
jest.mock('../../email/email.service', () => ({
  emailService: { send: jest.fn() },
}));
jest.mock('../../email/templates/contact-reply.template', () => ({
  renderContactReplyEmail: jest.fn(() => '<p>reply</p>'),
}));

import { contactMessageRepository } from '../contact.repository';
import { companyService } from '../../company/company.service';
import { emailService } from '../../email/email.service';
import { contactMessageService } from '../contact.service';

const message = {
  id: 'msg1',
  name: 'Rahul Sharma',
  email: 'rahul@example.com',
  subject: 'Pricing enquiry',
  message: 'How much does CCTV cost?',
  status: 'NEW',
  repliedAt: null,
  archivedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('contactMessageService.submit', () => {
  it('stores the message without creating a Lead or Client', async () => {
    (contactMessageRepository.create as jest.Mock).mockResolvedValue(message);

    const result = await contactMessageService.submit({
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      subject: 'Pricing enquiry',
      message: 'How much does CCTV cost?',
    });

    expect(result).toEqual(message);
    expect(contactMessageRepository.create).toHaveBeenCalledWith({
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      subject: 'Pricing enquiry',
      message: 'How much does CCTV cost?',
    });
  });
});

describe('contactMessageService.list', () => {
  it('delegates pagination and filters to the repository', async () => {
    (contactMessageRepository.list as jest.Mock).mockResolvedValue({ items: [message], total: 1 });

    const result = await contactMessageService.list(
      { page: 2, pageSize: 10, skip: 10, take: 10, sortOrder: 'asc' },
      { status: 'NEW', search: 'cctv' }
    );

    expect(result).toEqual({ items: [message], total: 1 });
    expect(contactMessageRepository.list).toHaveBeenCalledWith(
      { page: 2, pageSize: 10 },
      { status: 'NEW', search: 'cctv' }
    );
  });
});

describe('contactMessageService.getById', () => {
  it('returns the message when it exists', async () => {
    (contactMessageRepository.findById as jest.Mock).mockResolvedValue(message);
    const result = await contactMessageService.getById('msg1');
    expect(result).toEqual(message);
  });

  it('throws NotFoundError for an unknown message', async () => {
    (contactMessageRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(contactMessageService.getById('missing')).rejects.toThrow('Message not found');
  });
});

describe('contactMessageService.markRead', () => {
  it('marks a NEW message as read', async () => {
    (contactMessageRepository.findById as jest.Mock).mockResolvedValue(message);
    (contactMessageRepository.markRead as jest.Mock).mockResolvedValue({ ...message, status: 'READ' });

    const result = await contactMessageService.markRead('msg1');

    expect(contactMessageRepository.markRead).toHaveBeenCalledWith('msg1');
    expect(result).toMatchObject({ status: 'READ' });
  });

  it('leaves an already-read message untouched', async () => {
    (contactMessageRepository.findById as jest.Mock).mockResolvedValue({ ...message, status: 'READ' });

    const result = await contactMessageService.markRead('msg1');

    expect(contactMessageRepository.markRead).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: 'READ' });
  });

  it('throws NotFoundError for an unknown message', async () => {
    (contactMessageRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(contactMessageService.markRead('missing')).rejects.toThrow('Message not found');
  });
});

describe('contactMessageService.reply', () => {
  it('emails the visitor and stores the reply with the replying admin', async () => {
    (contactMessageRepository.findById as jest.Mock).mockResolvedValue(message);
    (companyService.get as jest.Mock).mockResolvedValue({ companyName: 'Nexus', supportEmail: 'support@nexus.local', replyToEmail: 'help@nexus.local' });
    (emailService.send as jest.Mock).mockResolvedValue({ id: 'email1' });
    (contactMessageRepository.markReplied as jest.Mock).mockResolvedValue({ ...message, status: 'REPLIED' });

    const result = await contactMessageService.reply('msg1', { body: 'Thanks for reaching out.' }, 'admin1');

    expect(emailService.send).toHaveBeenCalledWith({
      to: 'rahul@example.com',
      subject: 'Re: Pricing enquiry',
      html: '<p>reply</p>',
      replyTo: 'help@nexus.local',
    });
    expect(contactMessageRepository.markReplied).toHaveBeenCalledWith('msg1', 'Thanks for reaching out.', 'admin1');
    expect(result).toMatchObject({ status: 'REPLIED' });
  });

  it('falls back to the support mailbox when replyToEmail is not configured', async () => {
    (contactMessageRepository.findById as jest.Mock).mockResolvedValue(message);
    (companyService.get as jest.Mock).mockResolvedValue({ supportEmail: 'support@nexus.local' });

    await contactMessageService.reply('msg1', { body: 'Hi' }, 'admin1');

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: 'support@nexus.local' })
    );
  });

  it('sends without a reply-to when no mailbox is configured', async () => {
    (contactMessageRepository.findById as jest.Mock).mockResolvedValue(message);
    (companyService.get as jest.Mock).mockResolvedValue({});

    await contactMessageService.reply('msg1', { body: 'Hi' }, 'admin1');

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: undefined })
    );
  });

  it('rejects replying to an archived message', async () => {
    (contactMessageRepository.findById as jest.Mock).mockResolvedValue({ ...message, status: 'ARCHIVED' });
    await expect(contactMessageService.reply('msg1', { body: 'Hi' })).rejects.toThrow('restore the message first');
  });

  it('throws NotFoundError for an unknown message', async () => {
    (contactMessageRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(contactMessageService.reply('missing', { body: 'Hi' })).rejects.toThrow('Message not found');
  });
});

describe('contactMessageService.archive / restore / counts', () => {
  it('archives a message', async () => {
    (contactMessageRepository.findById as jest.Mock).mockResolvedValue(message);
    (contactMessageRepository.archive as jest.Mock).mockResolvedValue({ ...message, status: 'ARCHIVED' });

    const result = await contactMessageService.archive('msg1');

    expect(contactMessageRepository.archive).toHaveBeenCalledWith('msg1');
    expect(result).toMatchObject({ status: 'ARCHIVED' });
  });

  it('restores an archived message back to READ', async () => {
    (contactMessageRepository.findById as jest.Mock).mockResolvedValue({ ...message, status: 'ARCHIVED' });
    (contactMessageRepository.restore as jest.Mock).mockResolvedValue({ ...message, status: 'READ', archivedAt: null });

    const result = await contactMessageService.restore('msg1');

    expect(contactMessageRepository.restore).toHaveBeenCalledWith('msg1');
    expect(result).toMatchObject({ status: 'READ' });
  });

  it('throws NotFoundError when archiving an unknown message', async () => {
    (contactMessageRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(contactMessageService.archive('missing')).rejects.toThrow('Message not found');
  });

  it('returns new + unread counts from the repository', async () => {
    (contactMessageRepository.counts as jest.Mock).mockResolvedValue({ new: 3, unread: 7 });
    expect(await contactMessageService.counts()).toEqual({ new: 3, unread: 7 });
  });
});
