import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leadService, type LeadListParams, type CreateLeadInput, type UpdateLeadInput, type UpdateLeadServiceStatusInput } from '@/services/leadService';
import { serviceCatalogService } from '@/services/serviceCatalogService';
import { clientService } from '@/services/clientService';
import { queryKeys } from './keys';

export function useLeadsList(params: LeadListParams) {
  return useQuery({
    queryKey: queryKeys.leads.list(params),
    queryFn: () => leadService.list(params),
    placeholderData: (prev) => prev, // keep old page visible while the next page loads
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id ?? ''),
    queryFn: () => leadService.getById(id as string),
    enabled: !!id,
  });
}

export function useLeadNotes(leadId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.leads.notes(leadId ?? ''),
    queryFn: () => leadService.listNotes(leadId as string),
    enabled: !!leadId,
  });
}

export function useActiveServices() {
  return useQuery({
    queryKey: queryKeys.services.all,
    queryFn: () => serviceCatalogService.listServices(),
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeadInput) => leadService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useUpdateLead(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateLeadInput) => leadService.update(leadId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useAddLeadService(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { serviceId: string; questionnaireAnswers?: Record<string, unknown> }) =>
      leadService.addService(leadId, input),
    onSuccess: () => {
      // Adding a service changes the Lead's own detail payload (leadServices
      // array) - always refetch the detail, never assume the new shape.
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
    },
  });
}

export function useUpdateLeadServiceStatus(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadServiceId, input }: { leadServiceId: string; input: UpdateLeadServiceStatusInput }) =>
      leadService.updateServiceStatus(leadServiceId, input),
    onSuccess: (_data, variables) => {
      // Status is enforced entirely server-side by the Status Engine - we
      // never assume the transition was legal, we just refetch and let the
      // real state (or the rejection, surfaced via onError in the caller)
      // drive the UI. The transition's Timeline entry is recorded under
      // entityType LEAD_SERVICE keyed by leadServiceId (see
      // statusEngine.service.ts on the backend) - not leadId.
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline('LEAD_SERVICE', variables.leadServiceId) });
    },
  });
}

export function useAddLeadNote(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => leadService.addNote(leadId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.notes(leadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline('LEAD', leadId) });
    },
  });
}

export function useConvertLeadToClient(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clientService.convertLead(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}
