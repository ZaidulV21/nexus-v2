import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { useToast } from '@/hooks/useToast';
import { useUpdateLead } from '@/queries/useLeads';
import { ApiError } from '@/lib/api';
import type { Lead } from '@/types';

const editSchema = z.object({
  contactName: z.string().min(1, 'Required'),
  phone: z.string().min(6, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  companyName: z.string().optional(),
});
type EditFormValues = z.infer<typeof editSchema>;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value || '—'}</p>
    </div>
  );
}

export function LeadOverviewPanel({ lead }: { lead: Lead }) {
  const [isEditing, setIsEditing] = useState(false);
  const updateLead = useUpdateLead(lead.id);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      contactName: lead.contactName,
      phone: lead.phone,
      email: lead.email ?? '',
      companyName: lead.companyName ?? '',
    },
  });

  async function onSubmit(values: EditFormValues) {
    try {
      await updateLead.mutateAsync({ ...values, email: values.email || undefined });
      toast({ title: 'Lead updated', variant: 'success' });
      setIsEditing(false);
    } catch (err) {
      toast({
        title: 'Could not update lead',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <FormField label="Contact name" htmlFor="edit-contactName" error={errors.contactName?.message}>
          <Input id="edit-contactName" error={!!errors.contactName} {...register('contactName')} />
        </FormField>
        <FormField label="Phone" htmlFor="edit-phone" error={errors.phone?.message}>
          <Input id="edit-phone" error={!!errors.phone} {...register('phone')} />
        </FormField>
        <FormField label="Email" htmlFor="edit-email" error={errors.email?.message}>
          <Input id="edit-email" error={!!errors.email} {...register('email')} />
        </FormField>
        <FormField label="Company" htmlFor="edit-companyName">
          <Input id="edit-companyName" {...register('companyName')} />
        </FormField>
        <div className="col-span-full flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={isSubmitting}>
            Save changes
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact name" value={lead.contactName} />
        <Field label="Phone" value={lead.phone} />
        <Field label="Email" value={lead.email ?? ''} />
        <Field label="Company" value={lead.companyName ?? ''} />
        <Field label="Source" value={lead.source} />
        <Field label="Converted" value={lead.convertedAt ? 'Yes' : 'Not yet'} />
      </div>
    </div>
  );
}
