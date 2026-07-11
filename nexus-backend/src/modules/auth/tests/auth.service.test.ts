import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('../auth.repository', () => ({
  authRepository: {
    findUserByEmail: jest.fn(),
    findClientByEmail: jest.fn(),
    findUserById: jest.fn(),
    findClientById: jest.fn(),
    findRoleByName: jest.fn(),
    createUser: jest.fn(),
    updateUserPassword: jest.fn(),
    updateClientPassword: jest.fn(),
  },
}));

import { authRepository } from '../auth.repository';
import { authService } from '../auth.service';

describe('authService.login', () => {
  it('rejects login for a non-existent admin email', async () => {
    (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);
    await expect(
      authService.login({ email: 'nobody@nexus.test', password: 'x', actorType: 'ADMIN' })
    ).rejects.toThrow('Invalid credentials');
  });

  it('rejects login with a wrong password', async () => {
    const hash = await bcrypt.hash('correct-password', 4);
    (authRepository.findUserByEmail as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'admin@nexus.test',
      passwordHash: hash,
      isActive: true,
      roleId: 'role-admin',
      role: { id: 'role-admin', name: 'ADMIN' },
    });
    await expect(
      authService.login({ email: 'admin@nexus.test', password: 'wrong-password', actorType: 'ADMIN' })
    ).rejects.toThrow('Invalid credentials');
  });

  it('issues a token containing roleId for correct admin credentials', async () => {
    const hash = await bcrypt.hash('correct-password', 4);
    (authRepository.findUserByEmail as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'admin@nexus.test',
      passwordHash: hash,
      isActive: true,
      roleId: 'role-admin',
      role: { id: 'role-admin', name: 'ADMIN' },
    });
    const result = await authService.login({
      email: 'admin@nexus.test',
      password: 'correct-password',
      actorType: 'ADMIN',
    });
    expect(result.token).toBeDefined();
    expect(result.actor.type).toBe('ADMIN');
    expect(result.actor.role).toBe('ADMIN');

    // The whole point of this redesign: authorize() reads roleId straight
    // off the JWT payload, so it must be present and correct in the signed token.
    const decoded = jwt.decode(result.token) as any;
    expect(decoded.roleId).toBe('role-admin');
  });

  it('rejects login for an inactive/deactivated user', async () => {
    (authRepository.findUserByEmail as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'admin@nexus.test',
      passwordHash: 'irrelevant',
      isActive: false,
      roleId: 'role-admin',
      role: { id: 'role-admin', name: 'ADMIN' },
    });
    await expect(
      authService.login({ email: 'admin@nexus.test', password: 'x', actorType: 'ADMIN' })
    ).rejects.toThrow('Invalid credentials');
  });
});

describe('authService.createAdminUser', () => {
  it('resolves the Role by name rather than hardcoding a roleId', async () => {
    (authRepository.findRoleByName as jest.Mock).mockResolvedValue({ id: 'role-admin', name: 'ADMIN' });
    (authRepository.createUser as jest.Mock).mockResolvedValue({ id: 'u2' });

    await authService.createAdminUser({ email: 'new@nexus.test', password: 'somepassword123' });

    expect(authRepository.findRoleByName).toHaveBeenCalledWith('ADMIN');
    expect(authRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: 'role-admin' })
    );
  });

  it('throws if the target Role does not exist (e.g. roles were never seeded)', async () => {
    (authRepository.findRoleByName as jest.Mock).mockResolvedValue(null);
    await expect(
      authService.createAdminUser({ email: 'new@nexus.test', password: 'somepassword123' })
    ).rejects.toThrow('does not exist');
  });
});
