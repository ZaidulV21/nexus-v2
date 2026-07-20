import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  Landmark,
  CreditCard,
  Mail,
  Globe,
  Save,
  Upload,
  Image as ImageIcon,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useToast } from '@/hooks/useToast';
import {
  useCompanySettings,
  useUpdateCompanySettings,
  useUploadCompanyFile,
} from '@/queries/useCompany';
import { ROUTES } from '@/routes/routes';

const companySettingsSchema = z.object({
  companyName: z.string().optional(),
  legalBusinessName: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  cin: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  website: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  invoicePrefix: z.string().optional(),
  quotationPrefix: z.string().optional(),
  projectPrefix: z.string().optional(),
  clientPrefix: z.string().optional(),
  leadPrefix: z.string().optional(),
  defaultGstPercent: z.coerce.number().min(0).max(100).optional(),
  defaultPaymentTerms: z.string().optional(),
  bankName: z.string().optional(),
  accountHolder: z.string().optional(),
  accountNumber: z.string().optional(),
  ifsc: z.string().optional(),
  branch: z.string().optional(),
  upiId: z.string().optional(),
  senderName: z.string().optional(),
  replyToEmail: z.string().optional(),
  supportEmail: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  youtube: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySettingsSchema>;

function FileUploadField({
  label,
  field,
  currentUrl,
  accept = 'image/*',
  onUploaded,
}: {
  label: string;
  field: string;
  currentUrl: string | null;
  accept?: string;
  onUploaded: (field: string, url: string) => void;
}) {
  const { toast } = useToast();
  const uploadMutation = useUploadCompanyFile();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(
      { field, file },
      {
        onSuccess: (data) => {
          onUploaded(field, data.fileUrl);
          toast({ title: `${label} uploaded`, variant: 'success' });
        },
        onError: (err) => {
          toast({
            title: 'Upload failed',
            description: err instanceof Error ? err.message : 'Try again',
            variant: 'danger',
          });
        },
      }
    );
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-border bg-canvas">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={label}
            className="h-full w-full rounded object-contain p-1"
          />
        ) : (
          <ImageIcon className="h-6 w-6 text-ink-faint" strokeWidth={1.5} />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-ink">{label}</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => inputRef.current?.click()}
            loading={uploadMutation.isPending}
          >
            <Upload className="h-3.5 w-3.5" />
            {currentUrl ? 'Replace' : 'Upload'}
          </Button>
          {currentUrl && (
            <span className="text-xs text-ink-faint">Uploaded</span>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Icon className="h-4 w-4 text-ink-faint" />
            {title}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function CompanySettingsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: settings, isLoading } = useCompanySettings();
  const updateMutation = useUpdateCompanySettings();
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const isDirtyRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isDirty },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySettingsSchema),
  });

  isDirtyRef.current = isDirty;

  useEffect(() => {
    if (settings) {
      const values: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(settings)) {
        if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
        values[key] = val ?? '';
      }
      reset(values as CompanyFormValues);
      setFileUrls({
        logoUrl: settings.logoUrl ?? '',
        faviconUrl: settings.faviconUrl ?? '',
        qrCodeUrl: settings.qrCodeUrl ?? '',
        companySignatureUrl: settings.companySignatureUrl ?? '',
        companyStampUrl: settings.companyStampUrl ?? '',
      });
    }
  }, [settings, reset]);

  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [handleBeforeUnload]);

  function handleFileUploaded(field: string, url: string) {
    setFileUrls((prev) => ({ ...prev, [field]: url }));
    setValue(field as keyof CompanyFormValues, url, { shouldDirty: true });
  }

  function onSubmit(values: CompanyFormValues) {
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v === '' || v === null || v === undefined) continue;
      payload[k] = v;
    }
    for (const [k, v] of Object.entries(fileUrls)) {
      if (v) payload[k] = v;
    }

    updateMutation.mutate(payload as any, {
      onSuccess: () => {
        toast({ title: 'Settings saved', variant: 'success' });
        reset(values);
      },
      onError: (err) => {
        toast({
          title: 'Save failed',
          description: err instanceof Error ? err.message : 'Try again',
          variant: 'danger',
        });
      },
    });
  }

  function handleReset() {
    if (settings) {
      const values: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(settings)) {
        if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
        values[key] = val ?? '';
      }
      reset(values as CompanyFormValues);
      setFileUrls({
        logoUrl: settings.logoUrl ?? '',
        faviconUrl: settings.faviconUrl ?? '',
        qrCodeUrl: settings.qrCodeUrl ?? '',
        companySignatureUrl: settings.companySignatureUrl ?? '',
        companyStampUrl: settings.companyStampUrl ?? '',
      });
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Company Settings" description="Loading..." />
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-ink-muted">Loading settings...</p>
        </div>
      </div>
    );
  }

  const timezone = watch('timezone');
  const currency = watch('currency');

  return (
    <div>
      <PageHeader
        title="Company Settings"
        description="Manage your company profile, branding, and business configuration."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.settings)}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReset}
              disabled={!isDirty}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit(onSubmit)}
              loading={updateMutation.isPending}
              disabled={!isDirty}
            >
              <Save className="h-3.5 w-3.5" />
              Save changes
            </Button>
          </div>
        }
      />

      {isDirty && (
        <div className="mb-4 rounded-md bg-warning-subtle px-4 py-2 text-sm text-warning">
          You have unsaved changes.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Info */}
        <SectionCard icon={Building2} title="Company Information">
          <div className="space-y-4">
            <FileUploadField
              label="Logo"
              field="logoUrl"
              currentUrl={fileUrls.logoUrl}
              onUploaded={handleFileUploaded}
            />
            <FileUploadField
              label="Favicon"
              field="faviconUrl"
              currentUrl={fileUrls.faviconUrl}
              onUploaded={handleFileUploaded}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Company Name" htmlFor="companyName">
                <Input id="companyName" placeholder="Your Company" {...register('companyName')} />
              </FormField>
              <FormField label="Legal Business Name" htmlFor="legalBusinessName">
                <Input id="legalBusinessName" placeholder="Legal entity name" {...register('legalBusinessName')} />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="GST Number" htmlFor="gstNumber">
                <Input id="gstNumber" placeholder="27AABCU9603R1ZM" {...register('gstNumber')} />
              </FormField>
              <FormField label="PAN Number" htmlFor="panNumber">
                <Input id="panNumber" placeholder="AABCU9603R" {...register('panNumber')} />
              </FormField>
              <FormField label="CIN (optional)" htmlFor="cin">
                <Input id="cin" placeholder="U74140MH2013PTC" {...register('cin')} />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Email" htmlFor="email">
                <Input id="email" type="email" placeholder="info@company.com" {...register('email')} />
              </FormField>
              <FormField label="Phone" htmlFor="phone">
                <Input id="phone" placeholder="+91 98765 43210" {...register('phone')} />
              </FormField>
              <FormField label="WhatsApp Number" htmlFor="whatsappNumber">
                <Input id="whatsappNumber" placeholder="+91 98765 43210" {...register('whatsappNumber')} />
              </FormField>
            </div>
            <FormField label="Website" htmlFor="website">
              <Input id="website" placeholder="https://company.com" {...register('website')} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Address Line 1" htmlFor="addressLine1">
                <Input id="addressLine1" placeholder="Street address" {...register('addressLine1')} />
              </FormField>
              <FormField label="Address Line 2" htmlFor="addressLine2">
                <Input id="addressLine2" placeholder="Suite, floor, etc." {...register('addressLine2')} />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <FormField label="City" htmlFor="city">
                <Input id="city" placeholder="Mumbai" {...register('city')} />
              </FormField>
              <FormField label="State" htmlFor="state">
                <Input id="state" placeholder="Maharashtra" {...register('state')} />
              </FormField>
              <FormField label="Country" htmlFor="country">
                <Input id="country" placeholder="India" {...register('country')} />
              </FormField>
              <FormField label="Pincode" htmlFor="pincode">
                <Input id="pincode" placeholder="400001" {...register('pincode')} />
              </FormField>
            </div>
          </div>
        </SectionCard>

        {/* Business Settings */}
        <SectionCard icon={Landmark} title="Business Settings">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <FormField label="Currency" htmlFor="currency">
                <Select value={currency || 'INR'} onValueChange={(v) => setValue('currency', v, { shouldDirty: true })}>
                  <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Currency Symbol" htmlFor="currencySymbol">
                <Input id="currencySymbol" placeholder="₹" {...register('currencySymbol')} className="w-20" />
              </FormField>
              <FormField label="Timezone" htmlFor="timezone">
                <Select value={timezone || 'Asia/Kolkata'} onValueChange={(v) => setValue('timezone', v, { shouldDirty: true })}>
                  <SelectTrigger id="timezone"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                    <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Date Format" htmlFor="dateFormat">
                <Select value={watch('dateFormat') || 'dd/MM/yyyy'} onValueChange={(v) => setValue('dateFormat', v, { shouldDirty: true })}>
                  <SelectTrigger id="dateFormat"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd/MM/yyyy">dd/MM/yyyy</SelectItem>
                    <SelectItem value="MM/dd/yyyy">MM/dd/yyyy</SelectItem>
                    <SelectItem value="yyyy-MM-dd">yyyy-MM-dd</SelectItem>
                    <SelectItem value="dd MMM yyyy">dd MMM yyyy</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-5">
              <FormField label="Invoice Prefix" htmlFor="invoicePrefix">
                <Input id="invoicePrefix" placeholder="INV" {...register('invoicePrefix')} />
              </FormField>
              <FormField label="Quotation Prefix" htmlFor="quotationPrefix">
                <Input id="quotationPrefix" placeholder="QUO" {...register('quotationPrefix')} />
              </FormField>
              <FormField label="Project Prefix" htmlFor="projectPrefix">
                <Input id="projectPrefix" placeholder="PRJ" {...register('projectPrefix')} />
              </FormField>
              <FormField label="Client Prefix" htmlFor="clientPrefix">
                <Input id="clientPrefix" placeholder="CLI" {...register('clientPrefix')} />
              </FormField>
              <FormField label="Lead Prefix" htmlFor="leadPrefix">
                <Input id="leadPrefix" placeholder="LD" {...register('leadPrefix')} />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Default GST %" htmlFor="defaultGstPercent">
                <Input id="defaultGstPercent" type="number" step="0.01" min="0" max="100" {...register('defaultGstPercent')} />
              </FormField>
              <FormField label="Default Payment Terms" htmlFor="defaultPaymentTerms">
                <Input id="defaultPaymentTerms" placeholder="Net 30 days" {...register('defaultPaymentTerms')} />
              </FormField>
            </div>
            <FileUploadField
              label="Company Signature"
              field="companySignatureUrl"
              currentUrl={fileUrls.companySignatureUrl}
              onUploaded={handleFileUploaded}
            />
            <FileUploadField
              label="Company Stamp"
              field="companyStampUrl"
              currentUrl={fileUrls.companyStampUrl}
              onUploaded={handleFileUploaded}
            />
          </div>
        </SectionCard>

        {/* Bank Details */}
        <SectionCard icon={CreditCard} title="Bank Details">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Bank Name" htmlFor="bankName">
                <Input id="bankName" placeholder="State Bank of India" {...register('bankName')} />
              </FormField>
              <FormField label="Account Holder" htmlFor="accountHolder">
                <Input id="accountHolder" placeholder="Company Name Pvt Ltd" {...register('accountHolder')} />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Account Number" htmlFor="accountNumber">
                <Input id="accountNumber" placeholder="1234567890" {...register('accountNumber')} />
              </FormField>
              <FormField label="IFSC" htmlFor="ifsc">
                <Input id="ifsc" placeholder="SBIN0001234" {...register('ifsc')} />
              </FormField>
              <FormField label="Branch" htmlFor="branch">
                <Input id="branch" placeholder="Andheri West" {...register('branch')} />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="UPI ID" htmlFor="upiId">
                <Input id="upiId" placeholder="company@upi" {...register('upiId')} />
              </FormField>
              <FileUploadField
                label="QR Code Image"
                field="qrCodeUrl"
                currentUrl={fileUrls.qrCodeUrl}
                onUploaded={handleFileUploaded}
              />
            </div>
          </div>
        </SectionCard>

        {/* Email Settings */}
        <SectionCard icon={Mail} title="Email Settings">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Sender Name" htmlFor="senderName">
              <Input id="senderName" placeholder="Nexus CRM" {...register('senderName')} />
            </FormField>
            <FormField label="Reply-To Email" htmlFor="replyToEmail">
              <Input id="replyToEmail" type="email" placeholder="reply@company.com" {...register('replyToEmail')} />
            </FormField>
            <FormField label="Support Email" htmlFor="supportEmail">
              <Input id="supportEmail" type="email" placeholder="support@company.com" {...register('supportEmail')} />
            </FormField>
          </div>
        </SectionCard>

        {/* Social Links */}
        <SectionCard icon={Globe} title="Social Links">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Facebook" htmlFor="facebook">
              <Input id="facebook" placeholder="https://facebook.com/yourpage" {...register('facebook')} />
            </FormField>
            <FormField label="Instagram" htmlFor="instagram">
              <Input id="instagram" placeholder="https://instagram.com/yourpage" {...register('instagram')} />
            </FormField>
            <FormField label="LinkedIn" htmlFor="linkedin">
              <Input id="linkedin" placeholder="https://linkedin.com/company/yourpage" {...register('linkedin')} />
            </FormField>
            <FormField label="X / Twitter" htmlFor="twitter">
              <Input id="twitter" placeholder="https://x.com/yourhandle" {...register('twitter')} />
            </FormField>
            <FormField label="YouTube" htmlFor="youtube">
              <Input id="youtube" placeholder="https://youtube.com/@yourchannel" {...register('youtube')} />
            </FormField>
          </div>
        </SectionCard>

        {/* Bottom save bar */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Button variant="secondary" type="button" onClick={handleReset} disabled={!isDirty}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button type="submit" loading={updateMutation.isPending} disabled={!isDirty}>
            <Save className="h-3.5 w-3.5" />
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
