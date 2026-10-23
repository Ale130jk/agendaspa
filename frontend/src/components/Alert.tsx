import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

type Tone = 'info' | 'success' | 'error' | 'warning';

const tones: Record<Tone, string> = {
  info: 'border-sage-200 bg-sage-50 text-sage-900',
  success: 'border-sage-300 bg-sage-50 text-sage-900',
  error: 'border-clay-300 bg-clay-50 text-clay-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
};

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('rounded-2xl border px-4 py-3 text-sm leading-relaxed', tones[tone], className)}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? 'mt-1' : undefined}>{children}</div>
    </div>
  );
}
