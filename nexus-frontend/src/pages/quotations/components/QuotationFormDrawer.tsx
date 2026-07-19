import { useEffect } from 'react';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useClientsList } from '@/queries/useClients';
import { useActiveServices } from '@/queries/useLeads';
import { useCreateQuotation, useReviseQuotation } from '@/queries/useQuotations';
import { useToast } from '@/hooks/useToast';
import { ApiError } from '@/lib/api';
import type { CreateQuotationInput, ReviseQuotationInput } from '@/services/quotationService';
import type { Quotation } from '@/types';

const itemSchema = z.object({
  serviceId: z.string().min(1, 'Select a service'),
  description: z.string().min(1, 'Add a description'),
  quantity: z.string().min(1, 'Quantity is required'),
  unitPrice: z.string().min(1, 'Unit price is required'),
  taxRate: z.string().min(1, 'Tax rate is required'),
});

const createSchema = z.object({
  clientId: z.string().min(1, 'Select a Client'),
  discount: z.string().optional(),
  transportation: z.string().optional(),
  installation: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});

const reviseSchema = z.object({
  clientId: z.string().optional(),
  discount: z.string().optional(),
  transportation: z.string().optional(),
  installation: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});

type QuotationFormValues = {
  clientId?: string;
  discount?: string;
  transportation?: string;
  installation?: string;
  items: Array<{
    serviceId: string;
    description: string;
    quantity: string;
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
  const { data: services, isLoading: servicesLoading } = useActiveServices();
  const createQuotation = useCreateQuotation();
  const reviseQuotation = useReviseQuotation(quotation?.id ?? '');
  const { toast } = useToast();

  const schema = mode === 'create' ? createSchema : reviseSchema;
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuotationFormValues>({
    resolver: zodResolver(schema as z.ZodTypeAny),
    defaultValues: {
      clientId: '',
      discount: '0',
      transportation: '0',
      installation: '0',
      items: [{ serviceId: '', description: '', quantity: '1', unitPrice: '0', taxRate: '0' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (!open) {
      reset({
        clientId: '',
        discount: '0',
        transportation: '0',
        installation: '0',
        items: [{ serviceId: '', description: '', quantity: '1', unitPrice: '0', taxRate: '0' }],
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
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
        })),
      });
    }
  }, [open, mode, quotation, reset]);

  async function onSubmit(values: QuotationFormValues) {
    const sharedItems = values.items.map((item) => ({
      serviceId: item.serviceId,
      description: item.description,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      taxRate: Number(item.taxRate || 0),
    }));

    try {
      if (mode === 'create') {
        if (!values.clientId) {
          throw new Error('Client selection is required');
        }
        const payload: CreateQuotationInput = {
          clientId: values.clientId,
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
      <DrawerContent title={mode === 'create' ? 'New quotation' : 'Revise quotation'} description={mode === 'create' ? 'Create a quotation for a Client. Lead must be converted to Client first.' : 'Create a new version without overwriting the current one.'}>
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
                    <Select value={field.value} onValueChange={field.onChange}>
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

          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Discount" htmlFor="discount">
              <Input id="discount" type="number" min="0" step="0.01" placeholder="0" {...register('discount')} />
            </FormField>
            <FormField label="Transportation" htmlFor="transportation">
              <Input id="transportation" type="number" min="0" step="0.01" placeholder="0" {...register('transportation')} />
            </FormField>
            <FormField label="Installation" htmlFor="installation">
              <Input id="installation" type="number" min="0" step="0.01" placeholder="0" {...register('installation')} />
            </FormField>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Line items</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => append({ serviceId: '', description: '', quantity: '1', unitPrice: '0', taxRate: '0' })}>
                <Plus className="h-3.5 w-3.5" /> Add item
              </Button>
            </div>

            {errors.items?.message && <p className="mb-2 text-xs text-danger">{errors.items.message}</p>}

            {servicesLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="flex flex-col gap-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-ink-faint">Item {index + 1}</span>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} className="text-ink-faint transition-colors hover:text-danger">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField label="Service" htmlFor={`items.${index}.serviceId`} error={errors.items?.[index]?.serviceId?.message}>
                        <Controller
                          control={control}
                          name={`items.${index}.serviceId`}
                          render={({ field: selectField }) => (
                            <Select value={selectField.value} onValueChange={selectField.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a service" />
                              </SelectTrigger>
                              <SelectContent>
                                {services?.items.map((service) => (
                                  <SelectItem key={service.id} value={service.id}>
                                    {service.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </FormField>
                      <FormField label="Description" htmlFor={`items.${index}.description`} error={errors.items?.[index]?.description?.message}>
                        <Input id={`items.${index}.description`} placeholder="Scope of work" {...register(`items.${index}.description`)} />
                      </FormField>
                      <FormField label="Qty" htmlFor={`items.${index}.quantity`} error={errors.items?.[index]?.quantity?.message}>
                        <Input id={`items.${index}.quantity`} type="number" min="1" step="1" placeholder="1" {...register(`items.${index}.quantity`)} />
                      </FormField>
                      <FormField label="Unit price" htmlFor={`items.${index}.unitPrice`} error={errors.items?.[index]?.unitPrice?.message}>
                        <Input id={`items.${index}.unitPrice`} type="number" min="0" step="0.01" placeholder="0" {...register(`items.${index}.unitPrice`)} />
                      </FormField>
                      <FormField label="Tax rate (%)" htmlFor={`items.${index}.taxRate`} error={errors.items?.[index]?.taxRate?.message}>
                        <Input id={`items.${index}.taxRate`} type="number" min="0" max="100" step="0.01" placeholder="0" {...register(`items.${index}.taxRate`)} />
                      </FormField>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isSubmitting || createQuotation.isPending || reviseQuotation.isPending}>
              {mode === 'create' ? 'Create quotation' : 'Create revision'}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
