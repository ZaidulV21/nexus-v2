import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Drawer, DrawerContent } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Lock, Unlock } from 'lucide-react';
import { LineItemsEditor, newBuilderLine, type BuilderLine, type BuilderLineErrors } from '@/components/documents/LineItemsEditor';
import { DocumentTotalsSummary } from '@/components/documents/DocumentTotalsSummary';
import { useClientsList, useClientLeads, useClientServices } from '@/queries/useClients';
import { useLead } from '@/queries/useLeads';
import { useAuth } from '@/app/AuthContext';
import { useCreateQuotation, useReviseQuotation } from '@/queries/useQuotations';
import { useToast } from '@/hooks/useToast';
import { ApiError } from '@/lib/api';
import type { CreateQuotationInput, ReviseQuotationInput } from '@/services/quotationService';
import type { Quotation, Lead } from '@/types';

const itemSchema = z.object({
  serviceId: z.string().min(1, 'Select a service'),
  subServiceId: z.string().optional(),
  description: z.string().min(1, 'Add a description'),
  quantity: z.string().min(1, 'Quantity is required'),
  unit: z.string().optional(),
  unitPrice: z.string().min(1, 'Unit price is required'),
  taxRate: z.string().min(1, 'Tax rate is required'),
});

const createSchema = z.object({
  clientId: z.string().min(1, 'Select a Client'),
  leadId: z.string().min(1, 'Select a Lead'),
  discount: z.string().optional(),
  transportation: z.string().optional(),
  installation: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});

const reviseSchema = z.object({
  clientId: z.string().optional(),
  leadId: z.string().optional(),
  discount: z.string().optional(),
  transportation: z.string().optional(),
  installation: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});

type QuotationFormValues = {
  clientId?: string;
  leadId?: string;
  discount?: string;
  transportation?: string;
  installation?: string;
  items: Array<{
    serviceId: string;
    subServiceId?: string;
    description: string;
    quantity: string;
    unit?: string;
    unitPrice: string;
    taxRate: string;
  }>;
};

export function QuotationFormDrawer({
  open,
  onOpenChange,
  mode,
  quotation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'revise';
  quotation?: Quotation;
}) {
  const { data: clients, isLoading: clientsLoading } = useClientsList({ page: 1, pageSize: 100, sortBy: 'createdAt', sortOrder: 'desc' });
  const createQuotation = useCreateQuotation();
  const reviseQuotation = useReviseQuotation(quotation?.id ?? '');
  const { toast } = useToast();
  const { actor } = useAuth();
  const isAdmin = actor?.type === 'ADMIN';

  const schema = mode === 'create' ? createSchema : reviseSchema;
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<QuotationFormValues>({
    resolver: zodResolver(schema as z.ZodTypeAny),
    defaultValues: {
      clientId: '',
      leadId: '',
      discount: '0',
      transportation: '0',
      installation: '0',
      items: [newBuilderLine() as QuotationFormValues['items'][number]],
    },
  });

  const selectedClientId = watch('clientId');
  const selectedLeadId = watch('leadId');
  const items = watch('items');
  const discount = watch('discount') ?? '0';
  const transportation = watch('transportation') ?? '0';
  const installation = watch('installation') ?? '0';

  // Services offered to a client = that Client's OWN attached services. Never
  // the whole catalog: an interior firm doesn't offer lawn mowing, and the
  // dropdown stays honest to the service history.
  const servicesContextClientId = selectedClientId || (mode === 'revise' ? quotation?.clientId : undefined);
  const { data: clientServices, isLoading: servicesLoading } = useClientServices(servicesContextClientId || undefined);
  const { data: clientLeads, isLoading: leadsLoading } = useClientLeads(selectedClientId || undefined);

  // Phase 8: the full Lead Service lineage (Service + Sub Services) of the
  // selected Lead. Loaded once per Lead - the Lead detail endpoint already
  // returns leadServices[].subServices[] via the junction.
  const { data: leadDetail, isLoading: leadDetailLoading } = useLead(mode === 'create' ? selectedLeadId || undefined : undefined);

  // Derived lines are locked to the Lead's Service/Sub Service lineage by
  // default; Admins may unlock the Service picker when a one-off scope is
  // genuinely needed. Unlocked edits clear the derived sub-service so the line
  // can never carry a sub that belongs to a different service.
  const [servicesUnlocked, setServicesUnlocked] = useState(false);
  const derivedForLeadRef = useRef<string | null>(null);

  // Phase 8: auto-derive one line per sub-service (or one service-only line
  // when the Lead Service has none) straight from the Lead's Lead Services.
  // Runs once per selected Lead; pricing fields remain fully editable.
  function buildDerivedLines(lead: Lead): QuotationFormValues['items'] {
    const lines: QuotationFormValues['items'] = [];
    for (const leadService of lead.leadServices ?? []) {
      const serviceName = leadService.service?.name ?? 'Service';
      const subs = leadService.subServices ?? [];
      if (subs.length === 0) {
        const base = newBuilderLine() as QuotationFormValues['items'][number];
        lines.push({ ...base, serviceId: leadService.serviceId, description: serviceName });
      } else {
        for (const sub of subs) {
          const base = newBuilderLine() as QuotationFormValues['items'][number];
          lines.push({
            ...base,
            serviceId: leadService.serviceId,
            subServiceId: sub.subServiceId,
            description: `${serviceName} — ${sub.subService?.name ?? 'Sub service'}`,
          });
        }
      }
    }
    return lines.length > 0 ? lines : [newBuilderLine() as QuotationFormValues['items'][number]];
  }

  useEffect(() => {
    if (mode !== 'create' || !open) return;
    if (!selectedLeadId) {
      derivedForLeadRef.current = null;
      setServicesUnlocked(false);
      setValue('items', [newBuilderLine() as QuotationFormValues['items'][number]], { shouldValidate: true });
      return;
    }
    if (!leadDetail || derivedForLeadRef.current === selectedLeadId) return;
    setValue('items', buildDerivedLines(leadDetail), { shouldValidate: true });
    derivedForLeadRef.current = selectedLeadId;
    setServicesUnlocked(false);
  }, [mode, open, selectedLeadId, leadDetail, setValue]);

  useEffect(() => {
    if (!open) {
      derivedForLeadRef.current = null;
      setServicesUnlocked(false);
      reset({
        clientId: '',
        leadId: '',
        discount: '0',
        transportation: '0',
        installation: '0',
        items: [newBuilderLine() as QuotationFormValues['items'][number]],
      });
      return;
    }

    if (mode === 'revise' && quotation) {
      const activeVersion = quotation.versions.find((version) => version.id === quotation.activeVersionId) ?? quotation.versions[0];
      reset({
        clientId: quotation.clientId ?? '',
        discount: activeVersion?.discount ?? '0',
        transportation: activeVersion?.transportation ?? '0',
        installation: activeVersion?.installation ?? '0',
        items: (activeVersion?.items ?? []).map((item) => ({
          serviceId: item.serviceId,
          subServiceId: item.subServiceId ?? undefined,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit ?? 'None',
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
        })),
      });
    }
  }, [open, mode, quotation, reset]);

  function updateItem(index: number, field: keyof BuilderLine, value: string) {
    setValue(
      `items.${index}.${field}` as `items.${number}.serviceId` | `items.${number}.description` | `items.${number}.quantity` | `items.${number}.unit` | `items.${number}.unitPrice` | `items.${number}.taxRate`,
      value,
      { shouldValidate: true }
    );
  }

  function selectService(index: number, serviceId: string) {
    const selected = clientServices?.find((service) => service.id === serviceId);
    setValue(`items.${index}.serviceId`, serviceId, { shouldValidate: true });
    // A manually-chosen service can never keep a derived sub-service: the sub
    // would belong to the previously auto-derived service.
    setValue(`items.${index}.subServiceId` as any, undefined, { shouldValidate: true });
    if (selected && !items[index]?.description) {
      setValue(`items.${index}.description`, selected.name, { shouldValidate: true });
    }
  }

  function addItem() {
    setValue('items', [...items, newBuilderLine() as QuotationFormValues['items'][number]], { shouldValidate: true });
  }

  function removeItem(index: number) {
    if (items.length === 1) return;
    setValue('items', items.filter((_, itemIndex) => itemIndex !== index), { shouldValidate: true });
  }

  // Name lookups for the locked Service column: the derived Service name from
  // the Client's attached services, and the derived Sub Service name from the
  // Lead Service lineage loaded for the selected Lead.
  const serviceNameById = new Map((clientServices ?? []).map((service) => [service.id, service.name]));
  const subServiceNameById = new Map<string, string>();
  for (const leadService of leadDetail?.leadServices ?? []) {
    for (const sub of leadService.subServices ?? []) {
      subServiceNameById.set(sub.subServiceId, sub.subService?.name ?? 'Sub service');
    }
  }

  const itemErrorList = errors.items;
  const itemErrors: BuilderLineErrors[] = Array.isArray(itemErrorList)
    ? itemErrorList.map((entry) => {
        const fieldErrors = (entry ?? {}) as Record<string, { message?: string } | undefined>;
        return {
          description: fieldErrors.description?.message,
          quantity: fieldErrors.quantity?.message,
          unit: fieldErrors.unit?.message,
          unitPrice: fieldErrors.unitPrice?.message,
          taxRate: fieldErrors.taxRate?.message,
          serviceId: fieldErrors.serviceId?.message,
          hsnSacCode: fieldErrors.hsnSacCode?.message,
        };
      })
    : [];

  async function onSubmit(values: QuotationFormValues) {
    const sharedItems = values.items.map((item) => ({
      serviceId: item.serviceId,
      subServiceId: item.subServiceId || undefined,
      description: item.description,
      quantity: Number(item.quantity || 0),
      unit: item.unit || 'None',
      unitPrice: Number(item.unitPrice || 0),
      taxRate: Number(item.taxRate || 0),
    }));

    try {
      if (mode === 'create') {
        if (!values.clientId) {
          throw new Error('Client selection is required');
        }
        if (!values.leadId) {
          throw new Error('Lead selection is required');
        }
        const payload: CreateQuotationInput = {
          clientId: values.clientId,
          leadId: values.leadId,
          discount: Number(values.discount || 0),
          transportation: Number(values.transportation || 0),
          installation: Number(values.installation || 0),
          items: sharedItems,
        };
        await createQuotation.mutateAsync(payload);
        toast({ title: 'Quotation created', description: 'The quotation was created successfully.', variant: 'success' });
      } else {
        if (!quotation) throw new Error('Missing quotation context');
        const payload: ReviseQuotationInput = {
          discount: Number(values.discount || 0),
          transportation: Number(values.transportation || 0),
          installation: Number(values.installation || 0),
          items: sharedItems,
        };
        await reviseQuotation.mutateAsync(payload);
        toast({ title: 'Quotation revised', description: 'A new version was created successfully.', variant: 'success' });
      }
      onOpenChange(false);
    } catch (err) {
      toast({
        title: mode === 'create' ? 'Could not create quotation' : 'Could not revise quotation',
        description: err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
        variant: 'danger',
      });
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent title={mode === 'create' ? 'New quotation' : 'Revise quotation'} description={mode === 'create' ? 'Create a quotation for a Client. Lead must be converted to Client first.' : 'Create a new version without overwriting the current one.'} className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          {mode === 'create' && (
            <FormField label="Client" htmlFor="clientId" hint="Quotations can only be created for Clients. Convert the Lead first if needed." error={errors.clientId?.message}>
              {clientsLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Controller
                  control={control}
                  name="clientId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(val) => { field.onChange(val); setValue('leadId', ''); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.items.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.clientNumber} — {client.contactName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </FormField>
          )}

          {mode === 'create' && selectedClientId && (
            <FormField label="Lead" htmlFor="leadId" hint="Select the Lead this quotation is for." error={errors.leadId?.message}>
              {leadsLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Controller
                  control={control}
                  name="leadId"
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a lead" />
                      </SelectTrigger>
                      <SelectContent>
                        {(clientLeads ?? []).map((lead) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.leadNumber} — {lead.contactName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </FormField>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Discount" htmlFor="discount">
              <Input id="discount" type="number" min="0" step="0.01" placeholder="0" value={discount} onChange={(event) => setValue('discount', event.target.value, { shouldValidate: true })} />
            </FormField>
            <FormField label="Transportation" htmlFor="transportation">
              <Input id="transportation" type="number" min="0" step="0.01" placeholder="0" value={transportation} onChange={(event) => setValue('transportation', event.target.value, { shouldValidate: true })} />
            </FormField>
            <FormField label="Installation" htmlFor="installation">
              <Input id="installation" type="number" min="0" step="0.01" placeholder="0" value={installation} onChange={(event) => setValue('installation', event.target.value, { shouldValidate: true })} />
            </FormField>
          </div>

          {mode === 'create' && selectedLeadId && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
              <p className="text-xs text-ink-muted">
                {leadDetailLoading
                  ? 'Loading the Lead’s services…'
                  : servicesUnlocked
                    ? 'Services unlocked — the derived Service / Sub Service lines were cleared when you edited them.'
                    : 'Line items auto-derived from the Lead’s services (one line per sub-service). Price each line below.'}
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setServicesUnlocked((unlocked) => !unlocked)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary-strong"
                >
                  {servicesUnlocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {servicesUnlocked ? 'Re-lock services to Lead' : 'Unlock services to change'}
                </button>
              )}
            </div>
          )}

          <LineItemsEditor
            items={items as unknown as BuilderLine[]}
            onUpdate={updateItem}
            onAdd={addItem}
            onRemove={removeItem}
            errors={itemErrors}
            listError={errors.items?.message}
            extraColumnDisabled={mode === 'create' && !!selectedLeadId && !servicesUnlocked}
            renderExtraColumn={(index) =>
              mode === 'create' && !!selectedLeadId && !servicesUnlocked ? (
                <FormField label="Service" error={itemErrors[index]?.serviceId}>
                  <div className="flex h-9 items-center gap-2 rounded border border-border bg-canvas px-3 text-sm text-ink">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                    <span className="truncate">
                      {serviceNameById.get(items[index]?.serviceId ?? '') ?? 'Service'}
                      {items[index]?.subServiceId && subServiceNameById.has(items[index]?.subServiceId!) && (
                        <span className="text-ink-muted"> · {subServiceNameById.get(items[index]?.subServiceId!)}</span>
                      )}
                    </span>
                  </div>
                </FormField>
              ) : (
                <FormField label="Service" error={itemErrors[index]?.serviceId}>
                  {servicesLoading ? (
                    <Skeleton className="h-9 w-full" />
                  ) : (
                    <Select value={items[index]?.serviceId ?? ''} onValueChange={(value) => selectService(index, value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {(clientServices ?? []).map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                            {service.category?.name ? ` · ${service.category.name}` : ''}
                          </SelectItem>
                        ))}
                        {(clientServices ?? []).length === 0 && (
                          <SelectItem value="__none__" disabled>
                            No services attached to this client
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
              )
            }
          />

          <div className="sticky bottom-0 -mx-6 mt-auto space-y-4 border-t border-border bg-surface-raised px-6 pb-1 pt-4">
            <DocumentTotalsSummary items={items as unknown as BuilderLine[]} discount={Number(discount)} transportation={Number(transportation)} installation={Number(installation)} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={isSubmitting || createQuotation.isPending || reviseQuotation.isPending}>
                {mode === 'create' ? 'Create quotation' : 'Create revision'}
              </Button>
            </div>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
