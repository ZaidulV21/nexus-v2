import { StorageProvider } from './storage.interface';

// Production implementation - wire to an S3-compatible SDK at deployment
// time. Stubbed here so the interface contract and module boundary exist
// from day one, per the blueprint's "pluggable provider" pattern (matches
// notifications.channels' shape exactly).
export const s3StorageProvider: StorageProvider = {
  async save(fileName: string, buffer: Buffer, mimeType: string) {
    throw new Error('s3StorageProvider not yet configured - set STORAGE_DRIVER=local for development, or implement this provider before deploying to production.');
  },

  getUrl(fileUrl: string) {
    throw new Error('s3StorageProvider not yet configured');
  },
};
