import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-sage-700 text-white shadow-soft hover:bg-sage-800 active:bg-sage-900 disabled:bg-sage-300',
  secondary:
    'border border-sand-300 bg-white/80 text-ink hover:border-sage-500 hover:bg-white active:bg-sand-50',
  ghost: 'text-sage-800 hover:bg-sage-50 active:bg-sage-100',
  danger: 'bg-clay-600 text-white hover:bg-clay-700 active:bg-clay-800',
};

const sizeClasses: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-5 text-base',
};

export function buttonStyles(variant: Variant = 'primary', size: Size = 'md'): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-70',
    variantClasses[variant],
    sizeClasses[size],
  );
}
