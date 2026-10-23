import { cn } from '../lib/cn';

export function Spinner({ className, label = 'Cargando' }: { className?: string; label?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-3 text-sm text-sage-700', className)}>
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-sage-200 border-t-sage-700"
      />
      <span>{label}</span>
    </span>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center">
      <Spinner label="Preparando tu espacio" />
    </div>
  );
}
