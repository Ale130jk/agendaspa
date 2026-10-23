import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { ServiceCard, StaffCard } from '../components/Cards';
import { buttonStyles } from '../lib/buttonStyles';
import { Spinner } from '../components/Spinner';
import { useServices, useStaffList } from '../hooks/useCatalog';
import { formatMoney } from '../lib/format';

const steps = [
  {
    number: '01',
    title: 'Elige tu ritual',
    text: 'Filtra por servicio y terapeuta. Los horarios que ves ya descuentan descansos y reservas activas.',
  },
  {
    number: '02',
    title: 'Confirma tu espacio',
    text: 'Creas una reserva pendiente y la confirmas en los siguientes 5 minutos. Sin llamadas ni esperas.',
  },
  {
    number: '03',
    title: 'Llega y suelta',
    text: 'Llega unos minutos antes. Si necesitas cancelar, puedes hacerlo hasta 24 horas antes.',
  },
];

export function HomePage() {
  const servicesQuery = useServices();
  const staffQuery = useStaffList();
  const featured = servicesQuery.data?.[0];

  return (
    <div className="overflow-hidden">
      <section className="relative border-b border-sand-200 bg-sand-50">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-sage-100 blur-3xl sm:h-96 sm:w-96"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-clay-100/70 blur-3xl"
        />
        <div className="container-page relative grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
          <div className="motion-safe:animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-sand-300 bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-sage-800">
              <span className="h-1.5 w-1.5 rounded-full bg-sage-600" aria-hidden="true" />
              Spa urbano · Lima
            </p>
            <h1 className="mt-6 max-w-2xl font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Bajar el ritmo también se agenda.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink/65 sm:text-lg">
              Masajes, faciales y rituales de aromaterapia con disponibilidad real. Elige tu
              terapeuta, reserva en minutos y llega a un espacio pensado para desconectar.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/reservar" className={buttonStyles('primary', 'lg')}>
                Reservar un ritual
              </Link>
              <a href="#rituales" className={buttonStyles('secondary', 'lg')}>
                Ver rituales
              </a>
            </div>
            <dl className="mt-10 grid max-w-lg gap-4 text-sm sm:grid-cols-3">
              {[
                ['Reserva online', 'Sin llamadas'],
                ['Confirmación', 'En 5 minutos'],
                ['Cancelación', 'Hasta 24 h antes'],
              ].map(([label, value]) => (
                <div key={label} className="border-l border-sand-300 pl-3">
                  <dt className="text-xs uppercase tracking-[0.14em] text-ink/45">{label}</dt>
                  <dd className="mt-1 font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative motion-safe:animate-fade-up motion-safe:[animation-delay:120ms]">
            <div
              className="absolute -left-3 top-6 hidden h-24 w-24 rounded-full border border-sage-200 sm:block"
              aria-hidden="true"
            />
            <div className="relative rounded-[2rem] border border-sand-200 bg-white/85 p-6 shadow-lift backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-sage-700">
                  Ritual destacado
                </p>
                <span className="rounded-full bg-sage-50 px-2.5 py-1 text-xs font-semibold text-sage-800">
                  Disponible
                </span>
              </div>

              {servicesQuery.isLoading ? (
                <div className="mt-8">
                  <Spinner label="Cargando rituales" />
                </div>
              ) : featured ? (
                <>
                  <h2 className="mt-6 font-display text-3xl leading-tight text-ink">
                    {featured.name}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink/60">
                    {featured.description ?? 'Una pausa para volver a ti.'}
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-sand-100 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-ink/45">Duración</p>
                      <p className="mt-1 font-semibold text-ink">{featured.durationMinutes} min</p>
                    </div>
                    <div className="rounded-2xl bg-sage-50 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-ink/45">Desde</p>
                      <p className="mt-1 font-semibold text-sage-900">
                        {formatMoney(featured.priceCents)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-sand-200 pt-4 text-sm">
                    <span className="text-ink/55">Lima · Zona horaria local</span>
                    <Link
                      to={`/reservar?service=${featured.id}`}
                      className="font-semibold text-sage-800 hover:text-sage-900"
                    >
                      Elegir horario →
                    </Link>
                  </div>
                </>
              ) : (
                <p className="mt-6 text-sm text-ink/60">
                  El catálogo está tomando forma. Vuelve en un momento.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="rituales" className="container-page scroll-mt-24 py-16 sm:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-700">Rituales</p>
            <h2 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">
              Elige cómo quieres volver a ti.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/60">
              Cada servicio tiene una duración real y un precio claro. Sin paquetes sorpresa.
            </p>
          </div>
          <Link to="/reservar" className={buttonStyles('ghost', 'md')}>
            Ver disponibilidad →
          </Link>
        </div>

        {servicesQuery.isError ? (
          <Alert tone="error" className="mt-8" title="No pudimos cargar los servicios">
            Revisa tu conexión e intenta de nuevo.
          </Alert>
        ) : null}

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {servicesQuery.isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-80 animate-pulse rounded-3xl bg-sand-100" />
              ))
            : servicesQuery.data?.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
        </div>
      </section>

      <section
        id="como-funciona"
        className="scroll-mt-24 border-y border-sand-200 bg-sand-100/70 py-16 sm:py-20"
      >
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-700">
              Cómo funciona
            </p>
            <h2 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">
              Menos fricción, más tiempo para ti.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="rounded-3xl border border-sand-200 bg-white/70 p-6"
              >
                <p className="font-display text-3xl text-sage-400">{step.number}</p>
                <h3 className="mt-4 font-display text-2xl text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="equipo" className="container-page scroll-mt-24 py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-700">Equipo</p>
            <h2 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">
              Manos que escuchan.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink/60">
              Presión conversada, ritmo pausado y una atención que se adapta a lo que necesitas ese
              día. Puedes elegir a tu terapeuta al reservar.
            </p>
            <Link to="/reservar" className={`${buttonStyles('secondary', 'md')} mt-6`}>
              Reservar con el equipo
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {staffQuery.isLoading
              ? Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="h-56 animate-pulse rounded-3xl bg-sand-100" />
                ))
              : staffQuery.data?.map((member) => <StaffCard key={member.id} member={member} />)}
          </div>
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-sage-800 px-6 py-12 text-white sm:px-10 sm:py-14">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/15"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-sage-700/60"
          />
          <div className="relative max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-200">
              Tu próxima pausa
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
              Tu próximo descanso empieza con una reserva.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-sage-100/80">
              Elige un ritual, revisa los horarios reales y confirma en minutos. Si algo cambia,
              puedes cancelar hasta 24 horas antes.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/reservar"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-sand-50 px-5 text-sm font-semibold text-sage-900 transition hover:bg-white"
              >
                Reservar ahora
              </Link>
              <Link
                to="/registro"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
