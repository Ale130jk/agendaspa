import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="container-page py-10 sm:py-16">
      <div className="grid overflow-hidden rounded-[2rem] border border-sand-200 bg-white/70 shadow-soft lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden bg-sage-800 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/15"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-sage-700/60"
          />
          <div className="relative">
            <Link to="/" className="font-display text-2xl tracking-tight">
              AgendaSpa
            </Link>
            <p className="mt-10 max-w-sm font-display text-3xl leading-tight">
              Tu tiempo también merece un lugar tranquilo.
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-sage-100/75">
              Reservas claras, horarios reales y una pausa que puedes sostener en tu semana.
            </p>
          </div>
          <ul className="relative mt-12 space-y-3 text-sm text-sage-50/85">
            {[
              'Disponibilidad en tiempo real',
              'Confirmación en 5 minutos',
              'Cancela hasta 24 h antes',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-sand-300" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <div className="p-6 sm:p-10 lg:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-700">{eyebrow}</p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink/60">{description}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 border-t border-sand-200 pt-5 text-sm text-ink/60">{footer}</div>
        </div>
      </div>
    </div>
  );
}
