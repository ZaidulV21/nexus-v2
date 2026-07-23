import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, FileText, Image, Video } from 'lucide-react';
import { usePublicServices } from '@/queries/usePublicServices';
import type { WizardFileEntry } from '../types';

interface StepUploadsProps {
  selectedServices: string[];
  files: WizardFileEntry[];
  onAddFiles: (files: WizardFileEntry[]) => void;
  onRemoveFile: (fileId: string) => void;
}

function getFileType(file: File): 'image' | 'video' | 'document' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'document';
}

const FILE_ICONS = { image: Image, video: Video, document: FileText };

export function StepUploads({ selectedServices, files, onAddFiles, onRemoveFile }: StepUploadsProps) {
  const { data: services = [] } = usePublicServices();
  const selectedServiceData = services.filter((s) => selectedServices.includes(s.id));

  const handleFileChange = useCallback((serviceId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    const newFiles: WizardFileEntry[] = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      serviceId,
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      type: getFileType(file),
    }));

    onAddFiles(newFiles);
    e.target.value = '';
  }, [onAddFiles]);

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-xl font-bold text-ink">Upload Files</h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        Share images, documents, blueprints, or reference files for each service. (Optional)
      </p>

      <div className="mt-8 space-y-6">
        {selectedServiceData.map((service, sIndex) => {
          const serviceFiles = files.filter((f) => f.serviceId === service.id);

          return (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: sIndex * 0.08 }}
              className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
            >
              <h3 className="text-sm font-semibold text-ink">{service.name}</h3>

              {/* File upload zone */}
              <label className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-accent/50 hover:bg-accent-subtle/20 cursor-pointer">
                <Upload className="h-6 w-6 text-ink-faint" />
                <span className="mt-2 text-xs font-medium text-ink">Click to upload</span>
                <span className="mt-0.5 text-[11px] text-ink-faint">Images, PDFs, Documents up to 10MB</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.dwg"
                  onChange={(e) => handleFileChange(service.id, e)}
                  className="hidden"
                />
              </label>

              {/* Uploaded files list */}
              {serviceFiles.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {serviceFiles.map((file) => {
                    const FileIcon = FILE_ICONS[file.type];
                    return (
                      <div key={file.id} className="relative group rounded-lg border border-border bg-canvas p-2">
                        <div className="flex items-center gap-2">
                          {file.preview ? (
                            <img src={file.preview} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-accent-subtle">
                              <FileIcon className="h-4 w-4 text-accent" />
                            </div>
                          )}
                          <p className="text-xs text-ink truncate">{file.file.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveFile(file.id)}
                          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-dark/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
