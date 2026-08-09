import { prisma } from '../../config/database';

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findFirst({ where: { email, deletedAt: null }, include: { role: true } });
  },

  findClientByEmail(email: string) {
    // Case-insensitive so "John@Example.com" and "john@example.com" resolve to
    // the same account for login, OTP and account checks.
    return prisma.client.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' }, deletedAt: null },
    });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id }, include: { role: true } });
  },

  findClientById(id: string) {
    return prisma.client.findUnique({ where: { id } });
  },

  findRoleByName(name: string) {
    return prisma.role.findUnique({ where: { name } });
  },

  createUser(data: { email: string; phone?: string; passwordHash: string; roleId: string }) {
    return prisma.user.create({ data, include: { role: true } });
  },

  updateUserPassword(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash } });
  },

  updateClientPassword(id: string, passwordHash: string) {
    return prisma.client.update({ where: { id }, data: { passwordHash } });
  },
};
