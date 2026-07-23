import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { authRepository } from './auth.repository';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { UnauthorizedError, ValidationError, NotFoundError } from '../../core/errors/AppError';
import { LoginInput, ChangePasswordInput } from './auth.types';
import { AuthPayload } from '../../core/middleware/authenticate';

function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const PASSWORD_RESET_EXPIRY_MINUTES = 60;

export const authService = {
  async login(input: LoginInput) {
    if (input.actorType === 'ADMIN') {
      const user = await authRepository.findUserByEmail(input.email);
      if (!user || !user.isActive) throw new UnauthorizedError('Invalid credentials');
      const match = await bcrypt.compare(input.password, user.passwordHash);
      if (!match) throw new UnauthorizedError('Invalid credentials');

      const payload: AuthPayload = { id: user.id, type: 'ADMIN', email: user.email, roleId: user.roleId };
      return {
        token: signToken(payload),
        actor: { id: user.id, email: user.email, type: 'ADMIN', role: user.role.name },
      };
    }

    const client = await authRepository.findClientByEmail(input.email);
    if (!client || !client.isActive) throw new UnauthorizedError('Invalid credentials');
    const match = await bcrypt.compare(input.password, client.passwordHash);
    if (!match) throw new UnauthorizedError('Invalid credentials');

    const payload: AuthPayload = { id: client.id, type: 'CLIENT', email: client.email };
    return { token: signToken(payload), actor: { id: client.id, email: client.email, type: 'CLIENT' } };
  },

  async me(userId: string, type: 'ADMIN' | 'CLIENT') {
    if (type === 'ADMIN') {
      const user = await authRepository.findUserById(userId);
      if (!user) throw new UnauthorizedError();
      return { id: user.id, email: user.email, type: 'ADMIN', role: user.role.name };
    }
    const client = await authRepository.findClientById(userId);
    if (!client) throw new UnauthorizedError();
    return { id: client.id, email: client.email, type: 'CLIENT' };
  },

  async changePassword(userId: string, type: 'ADMIN' | 'CLIENT', input: ChangePasswordInput) {
    if (input.currentPassword === input.newPassword) {
      throw new ValidationError('New password must be different from current password');
    }

    if (type === 'ADMIN') {
      const user = await authRepository.findUserById(userId);
      if (!user) throw new UnauthorizedError();
      const match = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!match) throw new UnauthorizedError('Current password is incorrect');
      const hash = await bcrypt.hash(input.newPassword, env.bcryptSaltRounds);
      await authRepository.updateUserPassword(userId, hash);
      return { success: true };
    }

    const client = await authRepository.findClientById(userId);
    if (!client) throw new UnauthorizedError();
    const match = await bcrypt.compare(input.currentPassword, client.passwordHash);
    if (!match) throw new UnauthorizedError('Current password is incorrect');
    const hash = await bcrypt.hash(input.newPassword, env.bcryptSaltRounds);
    await authRepository.updateClientPassword(userId, hash);
    return { success: true };
  },

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    // Find client by email
    const client = await authRepository.findClientByEmail(normalizedEmail);
    if (!client) {
      // Return success even if email doesn't exist to prevent email enumeration
      return { success: true };
    }

    // Generate a secure random token
    const rawToken = randomBytes(32).toString('hex');
    const tokenHashVal = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

    // Delete any existing tokens for this email, then create new one
    await prisma.passwordResetToken.deleteMany({ where: { email: normalizedEmail } });
    await prisma.passwordResetToken.create({
      data: { email: normalizedEmail, tokenHash: tokenHashVal, expiresAt },
    });

    return { success: true, token: rawToken, clientName: client.contactName };
  },

  async resetPassword(token: string, newPassword: string) {
    const tokenHashVal = hashToken(token);

    const record = await prisma.passwordResetToken.findFirst({
      where: { tokenHash: tokenHashVal, usedAt: null },
    });

    if (!record) {
      throw new ValidationError('Invalid or expired reset link');
    }

    if (new Date() > record.expiresAt) {
      throw new ValidationError('Reset link has expired. Please request a new one.');
    }

    // Find client and update password
    const client = await authRepository.findClientByEmail(record.email);
    if (!client) {
      throw new NotFoundError('Account not found');
    }

    const passwordHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
    await authRepository.updateClientPassword(client.id, passwordHash);

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return { success: true };
  },

  // Internal-use only: seeding/admin-creation. Not exposed as an open
  // public endpoint in V1 (PRD: no self-service internal roles yet).
  // Resolves the "ADMIN" Role row rather than assuming a hardcoded value -
  // this is what makes adding a second role later a data change, not a
  // code change.
  async createAdminUser(data: { email: string; phone?: string; password: string; roleName?: string }) {
    const roleName = data.roleName ?? 'ADMIN';
    const role = await authRepository.findRoleByName(roleName);
    if (!role) {
      throw new NotFoundError(`Role "${roleName}" does not exist - seed roles before creating users`);
    }

    const passwordHash = await bcrypt.hash(data.password, env.bcryptSaltRounds);
    return authRepository.createUser({ email: data.email, phone: data.phone, passwordHash, roleId: role.id });
  },
};
