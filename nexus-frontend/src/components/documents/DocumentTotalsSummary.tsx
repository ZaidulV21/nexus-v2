import { lineTotal, type BuilderLine } from '@/components/documents/LineItemsEditor';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

function money(value: number): string {
  return formatCurrency(Number.isFinite(value) ? value : 0);
}

export function lineSubtotals(items: BuilderLine[]) {
  return items.reduce(
    (acc, item) => {
      const total = lineTotal(item.quantity, item.unitPrice, item.taxRate);
      const base = Number(item.quantity || 0) * Number(item.unitPrice || 0);
      acc.subtotal += base;
      acc.gst += total - base;
      return acc;
    },
    { subtotal: 0, gst: 0 }
  );
}

export function computeDocumentTotals(items: BuilderLine[], extras: { discount?: number; transportation?: number; installation?: number } = {}) {
  const { subtotal, gst } = lineSubtotals(items);
  const discount = Number(extras.discount || 0);
  const transportation = Number(extras.transportation || 0);
  const installation = Number(extras.installation || 0);
  return { subtotal, gst, grandTotal: subtotal + gst + transportation + installation - discount };
}

export function DocumentTotalsSummary({
  items,
  discount = 0,
  transportation = 0,
  installation = 0,
  className,
}: {
  items: BuilderLine[];
  discount?: number;
  transportation?: number;
  installation?: number;
  className?: string;
}) {
  const { subtotal, gst, grandTotal } = computeDocumentTotals(items, { discount, transportation, installation });
  return (
    <div className={cn('space-y-1.5 rounded-lg border border-border bg-canvas px-4 py-3', className)}>
      <div className="flex items-center justify-between text-sm text-ink-muted">
        <span>Subtotal</span>
        <span>{money(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between text-sm text-ink-muted">
        <span>GST</span>
        <span>{money(gst)}</span>
      </div>
      {(Number(discount) > 0 || Number(transportation) > 0 || Number(installation) > 0) && (
        <>
          {Number(discount) > 0 && (
            <div className="flex items-center justify-between text-sm text-ink-muted">
              <span>Discount</span>
              <span>-{money(discount)}</span>
            </div>
          )}
          {Number(transportation) > 0 && (
            <div className="flex items-center justify-between text-sm text-ink-muted">
              <span>Transportation</span>
              <span>{money(transportation)}</span>
            </div>
          )}
          {Number(installation) > 0 && (
            <div className="flex items-center justify-between text-sm text-ink-muted">
              <span>Installation</span>
              <span>{money(installation)}</span>
            </div>
          )}
        </>
      )}
      <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold text-ink">
        <span>Grand total</span>
        <span>{money(grandTotal)}</span>
      </div>
    </div>
  );
}
