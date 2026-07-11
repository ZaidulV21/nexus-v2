export interface StoredFileResult {
  fileUrl: string;
  fileSize: number;
}

export interface StorageProvider {
  save(fileName: string, buffer: Buffer, mimeType: string): Promise<StoredFileResult>;
  getUrl(fileUrl: string): string;
}
