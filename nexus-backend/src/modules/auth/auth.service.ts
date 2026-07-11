import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authRepository } from './auth.repository';
import { env } from '../../config/env';
import { UnauthorizedError, ValidationError, NotFoundError } from '../../core/errors/AppError';
import { LoginInput, ChangePasswordInput } from './auth.types';
import { AuthPayload } from '../../core/middleware/authenticate';

function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

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
