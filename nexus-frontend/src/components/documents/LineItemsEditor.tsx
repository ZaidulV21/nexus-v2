import { type ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { UNIT_OPTIONS, DEFAULT_UNIT } from '@/lib/units';
import { formatCurrency } from '@/lib/format';

// A single editable line shared by the Quotation and Invoice builders. The two
// documents differ only in their "extra" column - a Service for quotations, an
// HSN/SAC code for invoices - so the editor stays one reusable component.
export interface BuilderLine {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  taxRate: string;
  serviceId?: string;
  hsnSacCode?: string;
}

export type BuilderLineField = keyof BuilderLine;

export interface BuilderLineErrors {
  description?: string;
  quantity?: string;
  unit?: string;
  unitPrice?: string;
  taxRate?: string;
  serviceId?: string;
  hsnSacCode?: string;
}

export function lineTotal(quantity: string, unitPrice: string, taxRate: string): number {
  const qty = Number(quantity || 0);
  const price = Number(unitPrice || 0);
  const tax = Number(taxRate || 0);
  const base = qty * price;
  return base + (base * tax) / 100;
}

const emptyLine: BuilderLine = {
  description: '',
  quantity: '1',
  unit: DEFAULT_UNIT,
  unitPrice: '',
  taxRate: '',
};

export function newBuilderLine(): BuilderLine {
  return { ...emptyLine };
}

export function LineItemsEditor({
  items,
  onUpdate,
  onAdd,
  onRemove,
  errors = [],
  renderExtraColumn,
  extraColumnLabel,
  listError,
}: {
  items: BuilderLine[];
  onUpdate: (index: number, field: BuilderLineField, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  errors?: BuilderLineErrors[];
  /** Renders the document-specific column (Service / HSN-SAC) for a row. */
  renderExtraColumn?: (index: number) => ReactNode;
  extraColumnLabel?: string;
  /** Form-level error such as "Add at least one item". */
  listError?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">Line items</p>
        <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" /> Add item
        </Button>
      </div>

      {listError && <p className="text-xs text-danger">{listError}</p>}

      {items.map((item, index) => {
        const itemError = errors[index] ?? {};
        return (
          <div key={index} className="rounded-lg border border-border bg-surface p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">Item {index + 1}</span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={items.length === 1}
                className="text-ink-faint transition-colors hover:text-danger disabled:pointer-events-none disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid gap-3 lg:grid-cols-12">
              <div className="lg:col-span-6">
                {renderExtraColumn ? (
                  renderExtraColumn(index)
                ) : (
                  <FormField label={extraColumnLabel ?? 'Details'} error={itemError.description}>
                    <Input
                      type="text"
                      placeholder="Item description"
                      value={item.description}
                      onChange={(event) => onUpdate(index, 'description', event.target.value)}
                    />
                  </FormField>
                )}
              </div>

              <div className="lg:col-span-6">
                <FormField
                  label={renderExtraColumn ? 'Description' : extraColumnLabel ?? 'Description'}
                  error={itemError.description}
                >
                  <Input
                    type="text"
                    placeholder="Scope of work"
                    value={item.description}
                    onChange={(event) => onUpdate(index, 'description', event.target.value)}
                  />
                </FormField>
              </div>

              <div className="lg:col-span-2">
                <FormField label="Qty" error={itemError.quantity}>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="1"
                    value={item.quantity}
                    onChange={(event) => onUpdate(index, 'quantity', event.target.value)}
                  />
                </FormField>
              </div>

              <div className="lg:col-span-3">
                <FormField label="Unit" error={itemError.unit}>
                  <Select value={item.unit} onValueChange={(value) => onUpdate(index, 'unit', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <div className="lg:col-span-3">
                <FormField label="Unit price" error={itemError.unitPrice}>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={item.unitPrice}
                    onChange={(event) => onUpdate(index, 'unitPrice', event.target.value)}
                  />
                </FormField>
              </div>

              <div className="lg:col-span-2">
                <FormField label="Tax %" error={itemError.taxRate}>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="18"
                    value={item.taxRate}
                    onChange={(event) => onUpdate(index, 'taxRate', event.target.value)}
                  />
                </FormField>
              </div>

              <div className="lg:col-span-2">
                <FormField label="Line total">
                  <div className="flex h-9 items-center justify-end rounded border border-border bg-canvas px-3 text-sm font-medium text-ink">
                    {formatCurrency(lineTotal(item.quantity, item.unitPrice, item.taxRate))}
                  </div>
                </FormField>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
