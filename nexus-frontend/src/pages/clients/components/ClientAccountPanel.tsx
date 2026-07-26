import { useState } from 'react';
import { Shield, Mail, CheckCircle, XCircle, Clock, KeyRound, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import {
  useResetClientPassword,
  useSendClientWelcomeEmail,
  useToggleClientActive,
} from '@/queries/useClients';
import { formatDate } from '@/lib/format';
import type { Client } from '@/types';

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />}
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-faint">{label}</p>
        <p className="mt-1 text-sm font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}

export function ClientAccountPanel({ client }: { client: Client }) {
  const { toast } = useToast();
  const resetPassword = useResetClientPassword(client.id);
  const sendWelcome = useSendClientWelcomeEmail(client.id);
  const toggleActive = useToggleClientActive(client.id);

  const [confirmAction, setConfirmAction] = useState<'reset' | 'welcome' | 'deactivate' | 'activate' | null>(null);

  async function handleConfirm() {
    if (!confirmAction) return;

    try {
      if (confirmAction === 'reset') {
        await resetPassword.mutateAsync();
        toast({ title: 'Password reset email sent', variant: 'success' });
      } else if (confirmAction === 'welcome') {
        await sendWelcome.mutateAsync();
        toast({ title: 'Welcome email sent', variant: 'success' });
      } else if (confirmAction === 'deactivate') {
        await toggleActive.mutateAsync(false);
        toast({ title: 'Client account deactivated', variant: 'success' });
      } else if (confirmAction === 'activate') {
        await toggleActive.mutateAsync(true);
        toast({ title: 'Client account activated', variant: 'success' });
      }
    } catch {
      toast({ title: 'Action failed', variant: 'danger' });
    } finally {
      setConfirmAction(null);
    }
  }

  const isPending = resetPassword.isPending || sendWelcome.isPending || toggleActive.isPending;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-ink-muted">
          <InfoRow label="Login Email" value={client.email} icon={Mail} />
          <InfoRow label="Account Status" value={client.isActive ? 'Active' : 'Inactive'} icon={client.isActive ? CheckCircle : XCircle} />
          <InfoRow label="Last Login" value={client.lastLoginAt ? formatDate(client.lastLoginAt, 'dd MMM yyyy, h:mm a') : 'Never logged in'} icon={Clock} />
          <InfoRow label="Account Created" value={formatDate(client.createdAt, 'dd MMM yyyy, h:mm a')} icon={Shield} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-start"
            loading={resetPassword.isPending}
            onClick={() => setConfirmAction('reset')}
          >
            <KeyRound className="h-4 w-4" />
            Reset Password
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-start"
            loading={sendWelcome.isPending}
            onClick={() => setConfirmAction('welcome')}
          >
            <Send className="h-4 w-4" />
            Send Welcome Email
          </Button>

          {client.isActive ? (
            <Button
              variant="danger"
              size="sm"
              className="w-full justify-start"
              loading={toggleActive.isPending}
              onClick={() => setConfirmAction('deactivate')}
            >
              <XCircle className="h-4 w-4" />
              Deactivate Account
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-start"
              loading={toggleActive.isPending}
              onClick={() => setConfirmAction('activate')}
            >
              <CheckCircle className="h-4 w-4" />
              Activate Account
            </Button>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={
          confirmAction === 'reset' ? 'Reset client password?' :
          confirmAction === 'welcome' ? 'Send welcome email?' :
          confirmAction === 'deactivate' ? 'Deactivate client account?' :
          'Activate client account?'
        }
        description={
          confirmAction === 'reset'
            ? 'This will send a password reset email to the client. They will be able to set a new password via the link.'
            : confirmAction === 'welcome'
            ? 'This will send a welcome email with portal access instructions to the client.'
            : confirmAction === 'deactivate'
            ? 'The client will not be able to log in to the portal until the account is reactivated.'
            : 'The client will regain access to the portal.'
        }
        confirmLabel={
          confirmAction === 'reset' ? 'Send Reset Email' :
          confirmAction === 'welcome' ? 'Send Email' :
          confirmAction === 'deactivate' ? 'Deactivate' : 'Activate'
        }
        destructive={confirmAction === 'deactivate'}
        loading={isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
