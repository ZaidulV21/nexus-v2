import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { UpdateCompanySettingsInput } from './company.types';

const SINGLETON_ID = 'singleton';

export const companyRepository = {
  find() {
    return prisma.companySetting.findUnique({ where: { id: SINGLETON_ID } });
  },

  create(data: UpdateCompanySettingsInput) {
    return prisma.companySetting.create({ data: { id: SINGLETON_ID, ...data } });
  },

  update(data: UpdateCompanySettingsInput) {
    return prisma.companySetting.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    });
  },
};
