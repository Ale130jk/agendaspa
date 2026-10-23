import { Link } from 'react-router-dom';
import type { Service, StaffMember } from '../types/api';
import { formatMoney, initials } from '../lib/format';
import { buttonStyles } from '../lib/buttonStyles';
import { cn } from '../lib/cn';

export function ServiceCard({
  service,
  featured = false,
}: {
  service: Service;
  featured?: boolean;
}) {
  return (
    <article
      className={cn(
        'group flex h-full flex-col rounded-3xl border border-sand-200 bg-white/75 p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-sage-300 hover:shadow-lift',
        featured && 'bg-sand-100/80',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          aria-hidden="true"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sage-50 text-sage-700"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M12 20c4-2.2 6.5-5.2 6.5-8.5A4.5 4.5 0 0 0 12 8a4.5 4.5 0 0 0-6.5 3.5C5.5 14.8 8 17.8 12 20Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path d="M12 8V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
        <span className="rounded-full bg-sand-100 px-2.5 py-1 text-xs font-semibold text-ink/60">
          {service.durationMinutes} min
        </span>
      </div>
      <h3 className="mt-5 font-display text-2xl leading-tight text-ink">{service.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink/60">
        {service.description ?? 'Un espacio para volver a ti.'}
      </p>
      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-ink">{formatMoney(service.priceCents)}</span>
        <Link
          to={`/reservar?service=${service.id}`}
          className={buttonStyles('secondary', 'sm')}
          aria-label={`Reservar ${service.name}`}
        >
          Reservar
        </Link>
      </div>
    </article>
  );
}

export function StaffCard({ member }: { member: StaffMember }) {
  return (
    <article className="rounded-3xl border border-sand-200 bg-white/70 p-5">
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-sand-200 font-display text-lg text-sage-900"
        >
          {initials(member.fullName)}
        </div>
        <div>
          <h3 className="font-display text-xl leading-tight text-ink">{member.fullName}</h3>
          <p className="text-xs uppercase tracking-[0.16em] text-sage-700">Terapeuta</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-ink/60">
        {member.bio ?? 'Atención personalizada, ritmo pausado y presión conversada.'}
      </p>
      {member.services.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={`Servicios de ${member.fullName}`}>
          {member.services.slice(0, 3).map((service) => (
            <li
              key={service.id}
              className="rounded-full bg-sage-50 px-2.5 py-1 text-xs font-medium text-sage-800"
            >
              {service.name}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
