import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, CreditCard, Download, ExternalLink, FilePlus2, FileText, FolderKanban, Mail, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { EntityAuditLog } from '@/components/common/EntityAuditLog';
import { EntityTimeline } from '@/components/common/EntityTimeline';
import { useToast } from '@/hooks/useToast';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useCreateInvoice, useSendInvoice } from '@/queries/useInvoices';
import { useProject, useProjectDocuments, useProjectInvoices } from '@/queries/useProjects';
import { projectService } from '@/services/projectService';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import type { Invoice, NexusDocument, Project, ProjectService } from '@/types';
import { RecordPaymentModal } from '@/pages/invoices/components/RecordPaymentModal';
import { ProjectServiceStatusModal } from './components/ProjectServiceStatusModal';

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <div className="mt-0.5 text-sm text-ink">{value || '-'}</div>
    </div>
  );
}

function getClientName(project: Project) {
  if (!project.client) return project.clientId;
  return project.client.companyName || project.client.contactName;
}

function ProjectOverview({ project }: { project: Project }) {
  const quotation = project.quotations?.[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Project number" value={<span className="font-mono">{project.projectNumber}</span>} />
          <Field label="Client" value={getClientName(project)} />
          <Field label="Related lead" value={project.lead?.leadNumber ?? project.leadId} />
          <Field label="Linked quotation" value={quotation?.quotationNumber ?? '-'} />
          <Field label="Created" value={formatDateTime(project.createdAt)} />
          <Field label="Aggregate status" value={<StatusBadge status={project.aggregateStatus ?? 'NO SERVICES'} />} />
          <Field label="Completion percentage" value={`${project.completionPercentage ?? 0}%`} />
          <Field label="Total services" value={project.totalServices ?? project.projectServices?.length ?? 0} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link
            to={ROUTES.clientDetail(project.clientId)}
            className="flex items-center justify-between rounded border border-border bg-canvas px-3 py-2 text-sm hover:bg-surface"
          >
            <span>
              <span className="block font-medium text-ink">{getClientName(project)}</span>
              <span className="text-xs text-ink-faint">{project.client?.email ?? project.clientId}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-ink-faint" />
          </Link>
          <Link
            to={ROUTES.leadDetail(project.leadId)}
            className="flex items-center justify-between rounded border border-border bg-canvas px-3 py-2 text-sm hover:bg-surface"
          >
            <span>
              <span className="block font-medium text-ink">{project.lead?.leadNumber ?? 'Lead'}</span>
              <span className="text-xs text-ink-faint">{project.lead?.contactName ?? project.leadId}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-ink-faint" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectServices({
  project,
  onChangeStatus,
}: {
  project: Project;
  onChangeStatus: (service: ProjectService) => void;
}) {
  const services = project.projectServices ?? [];

  if (services.length === 0) {
    return <EmptyState title="No project services" description="Project services are created by the backend from approved lead services." />;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {services.map((service) => (
        <li key={service.id} className="px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ink">{service.service?.name ?? 'Service'}</p>
              <p className="text-xs text-ink-faint">{service.service?.category?.name ?? 'Catalog service'}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={service.status} />
              <div className="w-28">
                <div className="mb-1 flex justify-between text-xs text-ink-muted">
                  <span>Progress</span>
                  <span>{service.progressPercentage ?? 0}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-canvas">
                  <div
                    className="h-1.5 rounded-full bg-accent"
                    style={{ width: `${service.progressPercentage ?? 0}%` }}
                  />
                </div>
              </div>
              <button
                onClick={() => onChangeStatus(service)}
                className="flex items-center gap-0.5 text-xs font-medium text-accent hover:text-accent-hover"
              >
                Update Status <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {!!service.statusHistory?.length && (
            <div className="mt-3 rounded border border-border bg-canvas px-3 py-2">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">Status History</p>
              <div className="space-y-1.5">
                {service.statusHistory.map((entry) => (
                  <div key={entry.id} className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span>{formatDateTime(entry.createdAt)}</span>
                    <span>{entry.fromStatus ?? 'none'}</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="font-medium text-ink">{entry.toStatus}</span>
                    {entry.reason && <span className="text-ink-faint">Reason: {entry.reason}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function ProjectQuotation({ project }: { project: Project }) {
  const quotations = project.quotations ?? [];

  if (quotations.length === 0) {
    return <EmptyState title="No linked quotation" description="A linked quotation will appear here when the backend returns one for this project." />;
  }

  return (
    <div className="space-y-3">
      {quotations.map((quotation) => (
        <Card key={quotation.id}>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-sm font-medium text-ink">{quotation.quotationNumber}</p>
                <p className="text-xs text-ink-faint">Current version v{quotation.versionNumber}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={quotation.approvalStatus} />
                <span className="text-sm font-medium text-ink">{formatCurrency(quotation.grandTotal)}</span>
                <Button asChild variant="secondary" size="sm">
                  <Link to={ROUTES.quotationDetail(quotation.id)}>
                    <ExternalLink className="h-3.5 w-3.5" /> View Details
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface InvoiceItemForm {
  description: string;
  quantity: string;
  unitPrice: string;
  hsnSacCode: string;
  taxRate: string;
}

const emptyInvoiceItem: InvoiceItemForm = {
  description: '',
  quantity: '1',
  unitPrice: '',
  hsnSacCode: '',
  taxRate: '',
};

function GenerateInvoiceModal({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}) {
  const [label, setLabel] = useState('');
  const [items, setItems] = useState<InvoiceItemForm[]>([{ ...emptyInvoiceItem }]);
  const createInvoice = useCreateInvoice();
  const { toast } = useToast();

  async function handleSubmit() {
    try {
      await createInvoice.mutateAsync({
        projectId: project.id,
        clientId: project.clientId,
        label,
        items: items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          hsnSacCode: item.hsnSacCode,
          taxRate: Number(item.taxRate),
        })),
      });
      toast({ title: 'Invoice generated', variant: 'success' });
      setLabel('');
      setItems([{ ...emptyInvoiceItem }]);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Could not generate invoice',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  function updateItem(index: number, key: keyof InvoiceItemForm, value: string) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent title="Generate invoice" description={`Project ${project.projectNumber}`} className="max-w-2xl">
        <div className="flex flex-col gap-4">
          <FormField label="Invoice label" htmlFor="invoice-label">
            <Input
              id="invoice-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Advance, milestone, final payment..."
            />
          </FormField>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Line items</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setItems((current) => [...current, { ...emptyInvoiceItem }])}
              >
                <Plus className="h-3.5 w-3.5" /> Add item
              </Button>
            </div>
            {items.map((item, index) => (
              <div key={index} className="grid gap-3 rounded border border-border bg-canvas p-3 sm:grid-cols-2">
                <FormField label="Description" htmlFor={`invoice-item-description-${index}`}>
                  <Input
                    id={`invoice-item-description-${index}`}
                    value={item.description}
                    onChange={(event) => updateItem(index, 'description', event.target.value)}
                  />
                </FormField>
                <FormField label="HSN/SAC" htmlFor={`invoice-item-hsn-${index}`}>
                  <Input
                    id={`invoice-item-hsn-${index}`}
                    value={item.hsnSacCode}
                    onChange={(event) => updateItem(index, 'hsnSacCode', event.target.value)}
                  />
                </FormField>
                <FormField label="Quantity" htmlFor={`invoice-item-quantity-${index}`}>
                  <Input
                    id={`invoice-item-quantity-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                  />
                </FormField>
                <FormField label="Unit price" htmlFor={`invoice-item-price-${index}`}>
                  <Input
                    id={`invoice-item-price-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(event) => updateItem(index, 'unitPrice', event.target.value)}
                  />
                </FormField>
                <FormField label="Tax rate" htmlFor={`invoice-item-tax-${index}`}>
                  <Input
                    id={`invoice-item-tax-${index}`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={item.taxRate}
                    onChange={(event) => updateItem(index, 'taxRate', event.target.value)}
                  />
                </FormField>
                <div className="flex items-end justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={items.length === 1}
                    onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <ModalClose asChild>
              <Button variant="secondary" size="sm">
                Cancel
              </Button>
            </ModalClose>
            <Button size="sm" loading={createInvoice.isPending} onClick={handleSubmit}>
              Generate Invoice
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}

function ProjectInvoiceRow({ invoice }: { invoice: Invoice }) {
  const paymentModal = useDisclosure(false);
  const sendInvoice = useSendInvoice(invoice.id);
  const { toast } = useToast();

  async function handleSend() {
    try {
      await sendInvoice.mutateAsync(false);
      toast({ title: 'Invoice sent', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not send invoice',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="font-mono text-sm font-medium text-ink">{invoice.invoiceNumber}</p>
        <p className="text-xs text-ink-faint">{invoice.label}</p>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-4 sm:items-center">
        <StatusBadge status={invoice.displayStatus ?? invoice.status} />
        <span className="text-ink-muted">Amount {formatCurrency(invoice.grandTotal)}</span>
        <span className="text-ink-muted">Paid {formatCurrency(invoice.paidAmount ?? 0)}</span>
        <span className="text-ink-muted">Outstanding {formatCurrency(invoice.outstandingAmount ?? 0)}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link to={ROUTES.invoiceDetail(invoice.id)}>
            <ExternalLink className="h-3.5 w-3.5" /> View
          </Link>
        </Button>
        <Button variant="secondary" size="sm" loading={sendInvoice.isPending} onClick={handleSend}>
          <Mail className="h-3.5 w-3.5" /> Send
        </Button>
        <Button variant="secondary" size="sm" onClick={paymentModal.open}>
          <CreditCard className="h-3.5 w-3.5" /> Record Payment
        </Button>
        {invoice.pdfUrl && (
          <Button asChild variant="secondary" size="sm">
            <a href={invoice.pdfUrl} target="_blank" rel="noreferrer">
              <Download className="h-3.5 w-3.5" /> PDF
            </a>
          </Button>
        )}
      </div>
      <RecordPaymentModal open={paymentModal.isOpen} onOpenChange={paymentModal.setIsOpen} invoice={invoice} />
    </li>
  );
}

function ProjectInvoices({ project }: { project: Project }) {
  const { data: invoices, isLoading, isError, refetch } = useProjectInvoices(project.id);
  const generateModal = useDisclosure(false);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={generateModal.open}>
          <FilePlus2 className="h-3.5 w-3.5" /> Generate Invoice
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : isError ? (
        <ErrorState description="Couldn't load project invoices." onRetry={refetch} />
      ) : !invoices || invoices.length === 0 ? (
        <EmptyState title="No invoices" description="Generated project invoices will appear here." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {invoices.map((invoice: Invoice) => (
            <ProjectInvoiceRow key={invoice.id} invoice={invoice} />
          ))}
        </ul>
      )}

      <GenerateInvoiceModal open={generateModal.isOpen} onOpenChange={generateModal.setIsOpen} project={project} />
    </div>
  );
}

function ProjectDocuments({ projectId }: { projectId: string }) {
  const { data: documents, isLoading, isError, refetch } = useProjectDocuments(projectId);
  const { toast } = useToast();

  async function handleDownload(document: NexusDocument) {
    try {
      const result = await projectService.getDocumentDownload(document.id);
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast({
        title: 'Could not open document',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (isError) return <ErrorState description="Couldn't load project documents." onRetry={refetch} />;
  if (!documents || documents.length === 0) {
    return <EmptyState title="No documents" description="Project documents from the backend will appear here." />;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {documents.map((document) => (
        <li key={document.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-ink-faint" />
            <div>
              <p className="text-sm font-medium text-ink">{document.fileName}</p>
              <p className="text-xs text-ink-faint">
                {document.documentType} | {formatDate(document.createdAt)}
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => handleDownload(document)}>
            <Download className="h-3.5 w-3.5" /> View
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading, isError, refetch } = useProject(id);
  const [editingService, setEditingService] = useState<ProjectService | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !project) {
    return <ErrorState description="Couldn't load this project." onRetry={refetch} />;
  }

  return (
    <div>
      <PageHeader
        title={project.projectNumber}
        description={`${getClientName(project)} | ${project.lead?.leadNumber ?? project.leadId}`}
        actions={
          <span className="hidden items-center gap-2 text-sm text-ink-muted sm:flex">
            <FolderKanban className="h-4 w-4" /> Project
          </span>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <Tabs defaultValue="overview">
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="quotation">Quotation</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-5">
              <ProjectOverview project={project} />
            </TabsContent>
            <TabsContent value="services" className="pt-5">
              <ProjectServices project={project} onChangeStatus={setEditingService} />
            </TabsContent>
            <TabsContent value="quotation" className="pt-5">
              <ProjectQuotation project={project} />
            </TabsContent>
            <TabsContent value="invoices" className="pt-5">
              <ProjectInvoices project={project} />
            </TabsContent>
            <TabsContent value="documents" className="pt-5">
              <ProjectDocuments projectId={project.id} />
            </TabsContent>
            <TabsContent value="timeline" className="pt-5">
              <EntityTimeline entityType="PROJECT" entityId={project.id} />
            </TabsContent>
            <TabsContent value="audit" className="pt-5">
              <EntityAuditLog entityType="PROJECT" entityId={project.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {editingService && (
        <ProjectServiceStatusModal
          open={!!editingService}
          onOpenChange={(open) => !open && setEditingService(null)}
          projectId={project.id}
          projectService={editingService}
        />
      )}
    </div>
  );
}
