import { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useActiveServices, useCreateLead } from '@/queries/useLeads';
import { useToast } from '@/hooks/useToast';
import { ApiError } from '@/lib/api';

const serviceLineSchema = z.object({
  serviceId: z.string().min(1, 'Select a service'),
  notes: z.string().optional(),
});

const createLeadSchema = z.object({
  contactName: z.string().min(1, 'Contact name is required'),
  phone: z.string().min(6, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  companyName: z.string().optional(),
  services: z.array(serviceLineSchema).min(1, 'Add at least one service'),
});

type CreateLeadFormValues = z.infer<typeof createLeadSchema>;

export function CreateLeadDrawer({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (leadId: string) => void;
}) {
  const { data: services, isLoading: servicesLoading } = useActiveServices();
  const createLead = useCreateLead();
  const { toast } = useToast();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateLeadFormValues>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: { contactName: '', phone: '', email: '', companyName: '', services: [{ serviceId: '', notes: '' }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'services' });

  useEffect(() => {
    if (!open) reset({ contactName: '', phone: '', email: '', companyName: '', services: [{ serviceId: '', notes: '' }] });
  }, [open, reset]);

  async function onSubmit(values: CreateLeadFormValues) {
    try {
      const result = await createLead.mutateAsync({
        contactName: values.contactName,
        phone: values.phone,
        email: values.email || undefined,
        companyName: values.companyName || undefined,
        source: 'ADMIN',
        services: values.services.map((s) => ({
          serviceId: s.serviceId,
          questionnaireAnswers: s.notes ? { notes: s.notes } : undefined,
        })),
      });
      toast({
        title: 'Lead created',
        description: `${result.lead.leadNumber} created with ${result.leadServices.length} service(s).`,
        variant: 'success',
      });
      onCreated(result.lead.id);
    } catch (err) {
      toast({
        title: 'Could not create lead',
        description: err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
        variant: 'danger',
      });
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent title="New Lead" description="Log a multi-service enquiry - each service progresses independently from here.">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Contact name" htmlFor="contactName" required error={errors.contactName?.message}>
              <Input id="contactName" placeholder="Jane Doe" error={!!errors.contactName} {...register('contactName')} />
            </FormField>
            <FormField label="Phone" htmlFor="phone" required error={errors.phone?.message}>
              <Input id="phone" placeholder="9999999999" error={!!errors.phone} {...register('phone')} />
            </FormField>
            <FormField label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" placeholder="jane@example.com" error={!!errors.email} {...register('email')} />
            </FormField>
            <FormField label="Company" htmlFor="companyName" hint="Optional">
              <Input id="companyName" placeholder="Doe Enterprises" {...register('companyName')} />
            </FormField>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">
                Services <span className="text-danger">*</span>
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => append({ serviceId: '', notes: '' })}
              >
                <Plus className="h-3.5 w-3.5" /> Add service
              </Button>
            </div>

            {errors.services?.root?.message && (
              <p className="mb-2 text-xs text-danger">{errors.services.root.message}</p>
            )}
            {typeof errors.services?.message === 'string' && (
              <p className="mb-2 text-xs text-danger">{errors.services.message}</p>
            )}

            {servicesLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="flex flex-col gap-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-ink-faint">Service {index + 1}</span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-ink-faint transition-colors hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Controller
                        control={control}
                        name={`services.${index}.serviceId`}
                        render={({ field: selectField }) => (
                          <Select value={selectField.value} onValueChange={selectField.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a service" />
                            </SelectTrigger>
                            <SelectContent>
                              {services?.items.map((svc) => (
                                <SelectItem key={svc.id} value={svc.id}>
                                  {svc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.services?.[index]?.serviceId && (
                        <p className="text-xs text-danger">{errors.services[index]?.serviceId?.message}</p>
                      )}
                      <Textarea
                        placeholder="Requirement notes (optional)"
                        rows={2}
                        {...register(`services.${index}.notes`)}
                      />
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
            <Button type="submit" size="sm" loading={isSubmitting}>
              Create lead
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
