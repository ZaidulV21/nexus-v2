import { v2 as cloudinary } from 'cloudinary';
import { StorageProvider } from './storage.interface';
import { env } from '../../config/env';

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
  secure: true,
});

export const cloudinaryProvider: StorageProvider = {
  async save(fileName: string, buffer: Buffer, mimeType: string) {
    const folder = env.cloudinaryFolder || 'nexus';
    const publicId = `${folder}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const result = await new Promise<{ secure_url: string; bytes: number }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            public_id: publicId,
            resource_type: 'auto',
            format: mimeType.split('/')[1] || undefined,
            access_control: { access_type: 'anonymous' },
          },
          (error, result) => {
            if (error || !result) return reject(error || new Error('Cloudinary upload failed'));
            resolve({ secure_url: result.secure_url, bytes: result.bytes });
          }
        )
        .end(buffer);
    });

    return { fileUrl: result.secure_url, fileSize: result.bytes };
  },

  getUrl(fileUrl: string) {
    return fileUrl;
  },
};
