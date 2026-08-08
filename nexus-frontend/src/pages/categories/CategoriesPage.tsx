import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Power, FolderTree } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Modal, ModalContent } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { useDisclosure } from '@/hooks/useDisclosure';
import {
  useCategoryTree,
  useCreateCategory,
  useUpdateCategory,
  useDisableCategory,
} from '@/queries/useServices';
import { ApiError } from '@/lib/api';
import type { Category } from '@/types';

function flattenCategories(categories: Category[], depth = 0): Array<{ id: string; label: string; depth: number }> {
  return categories.flatMap((cat) => [
    { id: cat.id, label: cat.name, depth },
    ...flattenCategories(cat.children ?? [], depth + 1),
  ]);
}

function countChildren(category: Category): number {
  return (category.children ?? []).reduce((sum, child) => sum + 1 + countChildren(child), 0);
}

interface CategoryFormState {
  name: string;
  parentCategoryId: string;
}

const EMPTY_FORM: CategoryFormState = { name: '', parentCategoryId: '' };

export function CategoriesPage() {
  const { toast } = useToast();
  const { data: categories = [], isLoading, isError, refetch } = useCategoryTree();
  const createModal = useDisclosure(false);
  const editModal = useDisclosure(false);
  const disableModal = useDisclosure(false);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<Category | null>(null);
  const [disableTarget, setDisableTarget] = useState<Category | null>(null);

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory(editing?.id ?? '');
  const disableMutation = useDisableCategory(disableTarget?.id ?? '');

  const flat = useMemo(() => flattenCategories(categories), [categories]);

  async function handleCreate() {
    if (!form.name.trim()) return;
    try {
      await createMutation.mutateAsync({
        name: form.name.trim(),
        parentCategoryId: form.parentCategoryId || undefined,
      });
      toast({ title: 'Category created', description: `"${form.name.trim()}" was added to the catalog.`, variant: 'success' });
      setForm(EMPTY_FORM);
      createModal.close();
    } catch (err) {
      toast({
        title: 'Could not create category',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleUpdate() {
    if (!editing || !form.name.trim()) return;
    try {
      await updateMutation.mutateAsync({
        name: form.name.trim(),
        parentCategoryId: form.parentCategoryId || null,
      });
      toast({ title: 'Category updated', description: `"${form.name.trim()}" was saved.`, variant: 'success' });
      editModal.close();
    } catch (err) {
      toast({
        title: 'Could not update category',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleDisable() {
    if (!disableTarget) return;
    try {
      await disableMutation.mutateAsync();
      toast({
        title: 'Category disabled',
        description: `"${disableTarget.name}" is hidden from the public site and the enquiry wizard.`,
        variant: 'success',
      });
      setDisableTarget(null);
      disableModal.close();
    } catch (err) {
      toast({
        title: 'Could not disable category',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  function openEdit(category: Category) {
    setEditing(category);
    setForm({ name: category.name, parentCategoryId: category.parentCategoryId ?? '' });
    editModal.open();
  }

  const columns = useMemo<ColumnDef<Category, any>[]>(
    () => [
      {
        id: 'name',
        header: 'Category',
        cell: (info) => {
          const depth = flat.find((f) => f.id === info.row.original.id)?.depth ?? 0;
          return (
            <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 1.25}rem` }}>
              {depth > 0 && <span className="text-ink-faint">└</span>}
              <p className="text-sm font-medium text-ink">{info.row.original.name}</p>
            </div>
          );
        },
      },
      {
        id: 'parent',
        header: 'Parent',
        cell: (info) => (
          <span className="text-ink-muted">{info.row.original.parentCategoryId ? 'Sub-category' : 'Top-level'}</span>
        ),
      },
      {
        id: 'children',
        header: 'Sub-categories',
        cell: (info) => <span className="text-ink-muted">{countChildren(info.row.original)}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        cell: () => <Badge tone="success">Active</Badge>,
      },
    ],
    [flat]
  );

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize the service catalog into a hierarchy used by the public site and the enquiry wizard."
        actions={
          <Button size="sm" onClick={createModal.open}>
            <Plus className="h-3.5 w-3.5" /> New Category
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={categories}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        emptyTitle="No categories yet"
        emptyDescription="Add categories to group your services — e.g. Interior, Electrical, IT, Solar."
        rowActions={(category) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => openEdit(category)}
              title="Edit category"
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-accent"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                setDisableTarget(category);
                disableModal.open();
              }}
              title="Disable category"
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-warning"
            >
              <Power className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      />

      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint">
        <FolderTree className="h-3.5 w-3.5" />
        Disabled categories are hidden from the public site and no longer selectable in the enquiry wizard. Services
        attached to them stay intact.
      </p>

      {/* Create / Edit form */}
      <Modal open={createModal.isOpen || editModal.isOpen} onOpenChange={(open) => {
        if (!open) {
          createModal.close();
          editModal.close();
          setEditing(null);
        }
      }}>
        <ModalContent
          title={editing ? 'Edit category' : 'New category'}
          description={
            editing
              ? `Rename or re-parent "${editing.name}".`
              : 'A category groups related services; sub-categories nest under a top-level category.'
          }
        >
          <div className="space-y-4">
            <FormField label="Name">
              <Input
                value={form.name}
                placeholder="e.g. Interior Works"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </FormField>
            <FormField label="Parent category (optional)">
              <Select
                value={form.parentCategoryId || 'NONE'}
                onValueChange={(value) => setForm((f) => ({ ...f, parentCategoryId: value === 'NONE' ? '' : value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Top-level category</SelectItem>
                  {flat
                    .filter((c) => c.id !== editing?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </FormField>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                onClick={() => {
                  createModal.close();
                  editModal.close();
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button
                loading={createMutation.isPending || updateMutation.isPending}
                disabled={!form.name.trim()}
                onClick={editing ? handleUpdate : handleCreate}
              >
                <Plus className="h-3.5 w-3.5" /> {editing ? 'Save changes' : 'Create category'}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        open={disableModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            disableModal.close();
            setDisableTarget(null);
          }
        }}
        title="Disable this category?"
        description={
          disableTarget
            ? `"${disableTarget.name}" and its sub-categories will be hidden from the public site and the enquiry wizard. Services attached to them are not affected.`
            : ''
        }
        confirmLabel="Disable"
        destructive
        loading={disableMutation.isPending}
        onConfirm={handleDisable}
      />
    </div>
  );
}
