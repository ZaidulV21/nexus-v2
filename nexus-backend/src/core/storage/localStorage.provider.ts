import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StorageProvider } from './storage.interface';
import { env } from '../../config/env';

// Dev-only implementation of StorageProvider. Every module that handles
// files talks only to the StorageProvider interface, never to fs directly -
// swapping to s3Storage.provider.ts in production touches zero calling code.
export const localStorageProvider: StorageProvider = {
  async save(fileName: string, buffer: Buffer, mimeType: string) {
    const dir = env.localStoragePath;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const uniqueName = `${uuidv4()}-${fileName}`;
    const fullPath = path.join(dir, uniqueName);
    fs.writeFileSync(fullPath, buffer);

    return { fileUrl: uniqueName, fileSize: buffer.length };
  },

  getUrl(fileUrl: string) {
    return path.join(env.localStoragePath, fileUrl);
  },
};
