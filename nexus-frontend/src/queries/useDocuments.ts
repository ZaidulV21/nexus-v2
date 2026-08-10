import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentService, type DocumentListParams, type UploadDocumentInput } from '@/services/documentService';
import { queryKeys } from './keys';

/** Client-portal: documents attached to the authenticated client's records.
 *  Fetches the first page (max 100, most recent first) - the portal list and
 *  dashboard only render recent records. The backend returns a paginated
 *  { items, total } shape, normalized here to the array the pages expect. */
export function useMyDocuments(options?: { pageSize?: number }) {
  const pageSize = options?.pageSize ?? 100;
  return useQuery({
    queryKey: [...queryKeys.documents.clientList, { pageSize }],
    queryFn: async () => {
      const data = await documentService.listMine({ page: 1, pageSize });
      return Array.isArray(data) ? data : data.items;
    },
  });
}

/** Admin: paginated listing across all leads and projects. */
export function useAllDocuments(params: DocumentListParams) {
  return useQuery({
    queryKey: queryKeys.documents.adminList(params),
    queryFn: () => documentService.listAll(params),
    placeholderData: (prev) => prev,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadDocumentInput) => documentService.upload(input),
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      if (document.entityType === 'PROJECT') {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.documents(document.entityId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline(document.entityType, document.entityId) });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => documentService.remove(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}
