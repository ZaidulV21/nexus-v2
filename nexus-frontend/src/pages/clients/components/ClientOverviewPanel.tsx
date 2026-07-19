import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useUpdateClient } from '@/queries/useClients';
import { formatDate } from '@/lib/format';
import type { Client } from '@/types';

const clientSchema = z.object({
  companyName: z.string().optional(),
  contactName: z.string().min(1, 'Contact name is required'),
  phone: z.string().min(6, 'Phone is required'),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export function ClientOverviewPanel({ client }: { client: Client }) {
  const { toast } = useToast();
  const updateClient = useUpdateClient(client.id);
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      companyName: client.companyName ?? '',
      contactName: client.contactName,
      phone: client.phone,
    },
  });

  async function onSubmit(values: ClientFormValues) {
    try {
      await updateClient.mutateAsync({
        companyName: values.companyName || undefined,
        contactName: values.contactName,
        phone: values.phone,
      });
      toast({ title: 'Client updated', variant: 'success' });
    } catch {
      toast({ title: 'Could not update client', variant: 'danger' });
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <FormField label="Company" htmlFor="companyName">
              <Input id="companyName" {...register('companyName')} placeholder="Company name" />
            </FormField>
            <FormField label="Contact name" htmlFor="contactName" error={errors.contactName?.message} required>
              <Input id="contactName" {...register('contactName')} />
            </FormField>
            <FormField label="Phone" htmlFor="phone" error={errors.phone?.message} required>
              <Input id="phone" {...register('phone')} />
            </FormField>
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" loading={updateClient.isPending} disabled={!isDirty}>
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-ink-muted">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-faint">Client number</p>
            <p className="mt-1 font-mono font-medium text-ink">{client.clientNumber}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-faint">Email</p>
            <p className="mt-1 font-medium text-ink">{client.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-faint">Status</p>
            <p className="mt-1 font-medium text-ink">{client.isActive ? 'Active' : 'Inactive'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-faint">Created</p>
            <p className="mt-1 font-medium text-ink">{formatDate(client.createdAt)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
