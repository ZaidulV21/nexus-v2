import { api } from '@/lib/api';
import type { CompanySetting } from '@/types';

export type UpdateCompanySettingsInput = Partial<Omit<CompanySetting, 'id' | 'createdAt' | 'updatedAt'>>;

export const companyService = {
  get() {
    return api.get<CompanySetting>('/company/settings');
  },

  update(input: UpdateCompanySettingsInput) {
    return api.patch<CompanySetting>('/company/settings', input);
  },

  uploadFile(field: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<{ fileUrl: string; settings: CompanySetting }>(
      `/company/settings/upload?field=${field}`,
      formData
    );
  },
};
