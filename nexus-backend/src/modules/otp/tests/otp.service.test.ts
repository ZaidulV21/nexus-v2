jest.mock('../otp.repository', () => ({
  otpRepository: {
    findActiveByEmail: jest.fn(),
    upsert: jest.fn(),
    markVerified: jest.fn(),
    incrementAttempts: jest.fn(),
    deleteByEmail: jest.fn(),
    cleanupExpired: jest.fn(),
    OTP_EXPIRY_MINUTES: 10,
    MAX_ATTEMPTS: 5,
    RATE_LIMIT_MINUTES: 1,
  },
}));
jest.mock('../../auth/auth.repository', () => ({
  authRepository: {
    findClientByEmail: jest.fn(),
    findClientById: jest.fn(),
  },
}));
jest.mock('../../client/client.repository', () => ({
  clientRepository: {
    findByPhone: jest.fn(),
  },
}));
jest.mock('../../email/email.service', () => ({
  emailService: { send: jest.fn() },
}));
jest.mock('../../company/company.service', () => ({
  companyService: { get: jest.fn().mockResolvedValue({}) },
}));
jest.mock('../../auth/auth.service', () => ({
  signToken: jest.fn().mockReturnValue('signed-token'),
}));
jest.mock('../../../config/env', () => ({
  env: { appUrl: 'http://localhost:5173' },
}));

import { otpService } from '../otp.service';
import { authRepository } from '../../auth/auth.repository';
import { clientRepository } from '../../client/client.repository';
import { otpRepository } from '../otp.repository';
import { signToken } from '../../auth/auth.service';

function client(overrides: Record<string, unknown> = {}) {
  return {
    id: 'client-1',
    email: 'John@Example.com',
    phone: '+91 98765 43210',
    contactName: 'John Doe',
    isActive: true,
    deletedAt: null,
    ...overrides,
  };
}

describe('otpService.checkAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns existing when both email and phone match the same client', async () => {
    const c = client();
    (authRepository.findClientByEmail as jest.Mock).mockResolvedValue(c);
    (clientRepository.findByPhone as jest.Mock).mockResolvedValue(c);

    const result = await otpService.checkAccount({ email: 'john@example.com', phone: '+91 98765 43210' });

    expect(result).toMatchObject({
      exists: true,
      match: 'both',
      account: { clientId: 'client-1' },
      flags: { phoneMismatch: false, emailMismatch: false },
    });
    expect(result.account?.emailMasked).toContain('@');
    expect(result.account?.phoneMasked).toContain('3210');
  });

  it('matches an existing client by email only and flags a different submitted phone', async () => {
    const c = client({ phone: '+91 99999 00000' });
    (authRepository.findClientByEmail as jest.Mock).mockResolvedValue(c);
    (clientRepository.findByPhone as jest.Mock).mockResolvedValue(null);

    const result = await otpService.checkAccount({ email: 'john@example.com', phone: '+91 98765 43210' });

    expect(result.match).toBe('email');
    expect(result.exists).toBe(true);
    expect(result.flags.phoneMismatch).toBe(true);
    expect(result.flags.emailMismatch).toBe(false);
  });

  it('does not flag a phone mismatch when the submitted phone matches the account phone', async () => {
    const c = client({ phone: '+91 98765 43210' });
    (authRepository.findClientByEmail as jest.Mock).mockResolvedValue(c);
    (clientRepository.findByPhone as jest.Mock).mockResolvedValue(c);

    const result = await otpService.checkAccount({ email: 'john@example.com', phone: '+91-98765-43210' });

    expect(result.match).toBe('both');
    expect(result.flags.phoneMismatch).toBe(false);
  });

  it('matches an existing client by phone only and flags a different submitted email', async () => {
    const c = client({ email: 'onfile@example.com' });
    (authRepository.findClientByEmail as jest.Mock).mockResolvedValue(null);
    (clientRepository.findByPhone as jest.Mock).mockResolvedValue(c);

    const result = await otpService.checkAccount({ email: 'new@example.com', phone: '+91 98765 43210' });

    expect(result.match).toBe('phone');
    expect(result.exists).toBe(true);
    expect(result.flags.emailMismatch).toBe(true);
    expect(result.flags.phoneMismatch).toBe(false);
  });

  it('returns not existing when neither email nor phone match', async () => {
    (authRepository.findClientByEmail as jest.Mock).mockResolvedValue(null);
    (clientRepository.findByPhone as jest.Mock).mockResolvedValue(null);

    const result = await otpService.checkAccount({ email: 'new@example.com', phone: '+91 11111 22222' });

    expect(result).toMatchObject({ exists: false, match: null, account: null });
  });

  it('prefers the email match over a phone match on a different account', async () => {
    const emailClient = client({ id: 'client-email', phone: '+91 11111 22222' });
    const phoneClient = client({ id: 'client-phone', phone: '+91 98765 43210' });
    (authRepository.findClientByEmail as jest.Mock).mockResolvedValue(emailClient);
    (clientRepository.findByPhone as jest.Mock).mockResolvedValue(phoneClient);

    const result = await otpService.checkAccount({ email: 'john@example.com', phone: '+91 98765 43210' });

    expect(result.match).toBe('email');
    expect(result.account?.clientId).toBe('client-email');
    expect(result.flags.phoneMismatch).toBe(true);
  });
});

describe('otpService.sendOtpLogin / verifyOtpLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('sends a login OTP to the account email on file (normalized, not the entered email)', async () => {
    const c = client();
    (authRepository.findClientById as jest.Mock).mockResolvedValue(c);
    (otpRepository.findActiveByEmail as jest.Mock).mockResolvedValue(null);

    await otpService.sendOtpLogin('client-1');

    expect(otpRepository.upsert).toHaveBeenCalledWith(
      'john@example.com',
      expect.any(String),
      expect.any(Date)
    );
  });

  it('rejects login OTP for a missing or inactive account', async () => {
    (authRepository.findClientById as jest.Mock).mockResolvedValue(null);

    await expect(otpService.sendOtpLogin('missing')).rejects.toThrow('Account not found');
    await expect(otpService.verifyOtpLogin('missing', '123456')).rejects.toThrow('Account not found');
  });

  it('issues a CLIENT token when the login OTP verifies', async () => {
    const c = client();
    (authRepository.findClientById as jest.Mock).mockResolvedValue(c);
    jest.spyOn(otpService, 'verifyOtp').mockResolvedValue({ verified: true });

    const result = await otpService.verifyOtpLogin('client-1', '123456');

    expect(result).toEqual({
      token: 'signed-token',
      actor: { id: 'client-1', email: 'John@Example.com', type: 'CLIENT' },
    });
    expect(signToken).toHaveBeenCalledWith({ id: 'client-1', type: 'CLIENT', email: 'John@Example.com' });
  });

  it('rejects the login when the OTP does not verify', async () => {
    const c = client();
    (authRepository.findClientById as jest.Mock).mockResolvedValue(c);
    jest.spyOn(otpService, 'verifyOtp').mockResolvedValue({ verified: false });

    await expect(otpService.verifyOtpLogin('client-1', '000000')).rejects.toThrow('Invalid verification code');
    expect(signToken).not.toHaveBeenCalled();
  });
});
