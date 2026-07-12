import { useState } from 'react';
import {
  Download, Plus, Trash2, Mail, Search as SearchIcon, FileText, Users,
  ArrowUpRight, IndianRupee, FolderKanban, Receipt,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Switch } from '@/components/ui/Switch';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal, ModalTrigger, ModalContent, ModalClose } from '@/components/ui/Modal';
import { Drawer, DrawerTrigger, DrawerContent } from '@/components/ui/Drawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/DropdownMenu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton, SkeletonStatCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Timeline } from '@/components/ui/Timeline';
import { ActivityFeed } from '@/components/ui/ActivityFeed';
import { StatCard } from '@/components/ui/StatCard';
import { TrendLineChart, ComparisonBarChart, DistributionDonutChart } from '@/components/ui/Charts';
import { SearchInput } from '@/components/ui/SearchInput';
import { FilterBar } from '@/components/ui/FilterBar';
import { FormField } from '@/components/ui/FormField';
import { SaveIndicator } from '@/components/ui/SaveIndicator';
import { DataTable } from '@/components/ui/DataTable';
import { useToast } from '@/hooks/useToast';
import { useDisclosure } from '@/hooks/useDisclosure';
import { formatCurrency } from '@/lib/format';
import type { ColumnDef } from '@tanstack/react-table';

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Swatch({ name, className, hex }: { name: string; className: string; hex: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className={`h-16 ${className}`} />
      <div className="bg-surface px-3 py-2">
        <p className="text-xs font-medium text-ink">{name}</p>
        <p className="font-mono text-xs text-ink-faint">{hex}</p>
      </div>
    </div>
  );
}

interface DemoRow {
  id: string;
  lead: string;
  service: string;
  status: string;
  value: number;
}
const demoRows: DemoRow[] = [
  { id: '1', lead: 'L-00001 · John Doe', service: 'Interior Design', status: 'QUOTE SENT', value: 175000 },
  { id: '2', lead: 'L-00002 · Priya Sharma', service: 'Solar Installation', status: 'IN PROGRESS', value: 320000 },
  { id: '3', lead: 'L-00003 · Arjun Mehta', service: 'CCTV Installation', status: 'COMPLETED', value: 84000 },
];
const demoColumns: ColumnDef<DemoRow, any>[] = [
  { accessorKey: 'lead', header: 'Lead' },
  { accessorKey: 'service', header: 'Service' },
  { accessorKey: 'status', header: 'Status', cell: (info) => <StatusBadge status={info.getValue()} /> },
  { accessorKey: 'value', header: 'Value', cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span> },
];

const revenueTrend = [
  { month: 'Feb', revenue: 420000 },
  { month: 'Mar', revenue: 380000 },
  { month: 'Apr', revenue: 510000 },
  { month: 'May', revenue: 460000 },
  { month: 'Jun', revenue: 610000 },
  { month: 'Jul', revenue: 585000 },
];
const leadsByService = [
  { service: 'Interior', count: 18 },
  { service: 'Solar', count: 12 },
  { service: 'CCTV', count: 9 },
  { service: 'Electrical', count: 7 },
  { service: 'Branding', count: 5 },
];
const serviceDistribution = [
  { name: 'Interior', value: 18 },
  { name: 'Solar', value: 12 },
  { name: 'CCTV', value: 9 },
  { name: 'Electrical', value: 7 },
  { name: 'Branding', value: 5 },
];

export function DesignSystemPage() {
  const { toast } = useToast();
  const confirmDialog = useDisclosure(false);
  const [selectValue, setSelectValue] = useState('interior');
  const [page, setPage] = useState(1);

  return (
    <div>
      <PageHeader
        title="Design System"
        description="Every reusable primitive Nexus's modules will compose. Review this before any business page gets built."
      />

      <Section title="Color system" description="Neutral surface scale + one restrained accent, semantic colors used only for status meaning.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <Swatch name="Canvas" className="bg-canvas" hex="#FAFAFA" />
          <Swatch name="Surface" className="bg-surface" hex="#FFFFFF" />
          <Swatch name="Border" className="bg-border" hex="#E5E5E8" />
          <Swatch name="Ink" className="bg-ink" hex="#131316" />
          <Swatch name="Accent" className="bg-accent" hex="#4553FF" />
          <Swatch name="Success" className="bg-success" hex="#15803D" />
          <Swatch name="Warning" className="bg-warning" hex="#B45309" />
          <Swatch name="Danger" className="bg-danger" hex="#B91C1C" />
        </div>
      </Section>

      <Section title="Typography" description="Inter for UI, JetBrains Mono for data - amounts, IDs, timestamps.">
        <Card>
          <CardContent className="pt-5 space-y-3">
            <p className="text-3xl font-semibold text-ink">Display 3xl / Semibold</p>
            <p className="text-2xl font-semibold text-ink">Heading 2xl / Semibold</p>
            <p className="text-xl font-semibold text-ink">Heading xl / Semibold</p>
            <p className="text-md font-medium text-ink">Section title md / Medium</p>
            <p className="text-base text-ink">Body base - the default size for most interface text.</p>
            <p className="text-sm text-ink-muted">Secondary sm - muted, for supporting text.</p>
            <p className="text-xs text-ink-faint">Caption xs - faint, for metadata and timestamps.</p>
            <p className="font-mono text-sm text-ink">₹1,75,000.00 · INV/2026-27/00042 · a1b2c3d4</p>
          </CardContent>
        </Card>
      </Section>

      <Section title="Spacing & radius" description="4px base unit. Radius scale: 8 / 10 / 14 / 16px.">
        <div className="flex flex-wrap items-end gap-4">
          {[8, 10, 14, 16].map((r) => (
            <div key={r} className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 border-2 border-accent bg-accent-subtle" style={{ borderRadius: r }} />
              <span className="text-xs text-ink-muted">{r}px</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="link">Link button</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button size="icon" variant="secondary"><Plus className="h-4 w-4" /></Button>
          <Button size="sm"><Download className="h-3.5 w-3.5" /> Export</Button>
        </div>
      </Section>

      <Section title="Form components">
        <Card>
          <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
            <FormField label="Contact name" required htmlFor="ds-name">
              <Input id="ds-name" placeholder="John Doe" />
            </FormField>
            <FormField label="Email" htmlFor="ds-email" error="Enter a valid email address">
              <Input id="ds-email" leadingIcon={<Mail className="h-3.5 w-3.5" />} placeholder="john@example.com" error />
            </FormField>
            <FormField label="Service" htmlFor="ds-service" hint="Choose the primary service for this enquiry">
              <Select value={selectValue} onValueChange={setSelectValue}>
                <SelectTrigger id="ds-service"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="interior">Interior Design</SelectItem>
                  <SelectItem value="solar">Solar Installation</SelectItem>
                  <SelectItem value="cctv">CCTV Installation</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Requirement notes" htmlFor="ds-notes">
              <Textarea id="ds-notes" placeholder="Tell us about the requirement..." />
            </FormField>
            <div className="flex items-center gap-2">
              <Checkbox id="ds-check" defaultChecked />
              <label htmlFor="ds-check" className="text-sm text-ink">Site visit required</label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="ds-switch" defaultChecked />
              <label htmlFor="ds-switch" className="text-sm text-ink">Email notifications</label>
            </div>
          </CardContent>
          <CardFooter>
            <SaveIndicator status="saved" />
            <Button size="sm">Save changes</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Search & filters">
        <div className="flex flex-col gap-4">
          <SearchInput placeholder="Search leads, clients, invoices..." className="max-w-sm" />
          <FilterBar activeFilters={[{ key: 'status', label: 'Status: In Progress' }, { key: 'service', label: 'Service: Solar' }]}>
            <Select defaultValue="all"><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem></SelectContent>
            </Select>
            <Select defaultValue="all"><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All services</SelectItem><SelectItem value="solar">Solar</SelectItem></SelectContent>
            </Select>
          </FilterBar>
        </div>
      </Section>

      <Section title="Status badges" description="Tone is derived from the workflow status - never manually chosen per instance.">
        <div className="flex flex-wrap gap-2">
          {['NEW', 'QUOTE SENT', 'NEGOTIATION', 'APPROVED', 'IN PROGRESS', 'ON HOLD', 'COMPLETED', 'CANCELLED'].map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
          <Badge tone="accent">Custom badge</Badge>
        </div>
      </Section>

      <Section title="Statistic cards">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Leads" value="142" icon={FileText} trend={{ value: '+12%', direction: 'up', positive: true }} />
          <StatCard label="Active Projects" value="28" icon={FolderKanban} trend={{ value: '+3', direction: 'up', positive: true }} />
          <StatCard label="Revenue (MTD)" value={formatCurrency(585000)} icon={IndianRupee} trend={{ value: '+9.4%', direction: 'up', positive: true }} />
          <StatCard label="Outstanding" value={formatCurrency(212000)} icon={Receipt} trend={{ value: '-4.1%', direction: 'down', positive: true }} />
        </div>
      </Section>

      <Section title="Charts">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Revenue trend</CardTitle><CardDescription>Last 6 months</CardDescription></CardHeader>
            <CardContent><TrendLineChart data={revenueTrend} dataKey="revenue" xKey="month" /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Service distribution</CardTitle></CardHeader>
            <CardContent><DistributionDonutChart data={serviceDistribution} /></CardContent>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader><CardTitle>Leads by service</CardTitle></CardHeader>
            <CardContent><ComparisonBarChart data={leadsByService} dataKey="count" xKey="service" /></CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Data table" description="Sorting, loading/empty/error states, and pagination are built in - every module composes this.">
        <DataTable
          columns={demoColumns}
          data={demoRows}
          pagination={{ page, totalPages: 4, total: 37, pageSize: 10, onPageChange: setPage }}
          rowActions={() => (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded p-1 hover:bg-canvas">⋯</DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View details</DropdownMenuItem>
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-danger">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      </Section>

      <Section title="Timeline & activity feed">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent>
              <Timeline
                events={[
                  { id: '1', entityType: 'LEAD', entityId: '1', eventType: 'LEAD_CREATED', description: 'Lead L-00001 created with 2 services', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
                  { id: '2', entityType: 'LEAD', entityId: '1', eventType: 'STATUS_CHANGED', description: 'Status changed from NEW to QUALIFIED', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
                  { id: '3', entityType: 'QUOTATION', entityId: '1', eventType: 'QUOTATION_SENT', description: 'Quotation Q-00001 sent, total ₹1,75,000', createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Activity feed</CardTitle></CardHeader>
            <CardContent>
              <ActivityFeed
                items={[
                  { id: '1', actorName: 'Admin User', action: 'approved quotation', target: 'Q-00001', timestamp: new Date(Date.now() - 3600000).toISOString() },
                  { id: '2', actorName: 'Admin User', action: 'recorded a payment on', target: 'INV/2026-27/00042', timestamp: new Date(Date.now() - 7200000).toISOString() },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Modal, Drawer & Confirm dialog">
        <div className="flex flex-wrap gap-3">
          <Modal>
            <ModalTrigger asChild><Button variant="secondary">Open modal</Button></ModalTrigger>
            <ModalContent title="Create Lead" description="Quick-create a lead from the dashboard.">
              <div className="space-y-3">
                <FormField label="Contact name"><Input placeholder="Jane Doe" /></FormField>
                <FormField label="Phone"><Input placeholder="9999999999" /></FormField>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <ModalClose asChild><Button variant="secondary" size="sm">Cancel</Button></ModalClose>
                <Button size="sm">Create lead</Button>
              </div>
            </ModalContent>
          </Modal>

          <Drawer>
            <DrawerTrigger asChild><Button variant="secondary">Open drawer</Button></DrawerTrigger>
            <DrawerContent title="Lead L-00001" description="John Doe · Doe Enterprises">
              <div className="space-y-4">
                <div><p className="text-xs text-ink-faint">Phone</p><p className="text-sm text-ink">9999999999</p></div>
                <div><p className="text-xs text-ink-faint">Services</p>
                  <div className="mt-1 flex gap-1.5"><StatusBadge status="IN PROGRESS" /><StatusBadge status="QUOTE SENT" /></div>
                </div>
              </div>
            </DrawerContent>
          </Drawer>

          <Button variant="danger" onClick={confirmDialog.open}><Trash2 className="h-3.5 w-3.5" /> Delete lead</Button>
          <ConfirmDialog
            open={confirmDialog.isOpen}
            onOpenChange={confirmDialog.setIsOpen}
            title="Delete this lead?"
            description="This can't be undone. The lead and its associated services will be archived."
            confirmLabel="Delete"
            destructive
            onConfirm={confirmDialog.close}
          />
        </div>
      </Section>

      <Section title="Tooltip, Dropdown menu & Tabs">
        <div className="flex flex-wrap items-center gap-4">
          <Tooltip content="Approved via phone on 9 Jul"><span className="cursor-default text-sm text-ink-muted underline decoration-dotted">Hover for details</span></Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="secondary" size="sm">Actions <ArrowUpRight className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem><FileText className="h-3.5 w-3.5" /> New lead</DropdownMenuItem>
              <DropdownMenuItem><Users className="h-3.5 w-3.5" /> New client</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Tabs defaultValue="overview" className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="pt-4 text-sm text-ink-muted">Overview panel content.</TabsContent>
          <TabsContent value="services" className="pt-4 text-sm text-ink-muted">Services panel content.</TabsContent>
          <TabsContent value="documents" className="pt-4 text-sm text-ink-muted">Documents panel content.</TabsContent>
        </Tabs>
      </Section>

      <Section title="Breadcrumbs & Pagination">
        <Breadcrumbs items={[{ label: 'Leads', href: '#' }, { label: 'L-00001', href: '#' }, { label: 'Edit' }]} className="mb-4" />
        <Card><Pagination page={2} totalPages={6} total={53} pageSize={10} onPageChange={() => {}} /></Card>
      </Section>

      <Section title="Skeleton loaders">
        <div className="grid gap-3 sm:grid-cols-3">
          <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
        </div>
        <Skeleton className="mt-3 h-24 w-full rounded-lg" />
      </Section>

      <Section title="Empty & error states">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><EmptyState icon={SearchIcon} title="No results found" description="Try adjusting your filters or search term." actionLabel="Clear filters" onAction={() => {}} /></Card>
          <Card><ErrorState onRetry={() => {}} /></Card>
        </div>
      </Section>

      <Section title="Toasts">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast({ title: 'Quotation sent', description: 'Q-00001 was sent to the client.', variant: 'success' })}>Trigger success</Button>
          <Button variant="secondary" onClick={() => toast({ title: 'Payment overdue', description: '3 invoices are past due.', variant: 'warning' })}>Trigger warning</Button>
          <Button variant="secondary" onClick={() => toast({ title: 'Failed to save', description: 'Check your connection and try again.', variant: 'danger' })}>Trigger error</Button>
        </div>
      </Section>

      <Section title="Avatars">
        <div className="flex items-center gap-2">
          <Avatar name="John Doe" size={28} /><Avatar name="Priya Sharma" size={28} /><Avatar name="Arjun Mehta" size={36} />
        </div>
      </Section>
    </div>
  );
}
