import type { BookingStatus } from '../types/api';
import { STATUS_LABELS } from '../lib/format';
import { cn } from '../lib/cn';

const styles: Record<BookingStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  CONFIRMED: 'border-sage-200 bg-sage-50 text-sage-800',
  CANCELLED: 'border-clay-200 bg-clay-50 text-clay-800',
  COMPLETED: 'border-sand-300 bg-sand-100 text-ink/70',
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        styles[status],
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}
