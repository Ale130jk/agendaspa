import { useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { buttonStyles } from '../lib/buttonStyles';
import { EmptyState, PageHeader } from '../components/PageHeader';
import { Field, Input } from '../components/Field';
import { Spinner } from '../components/Spinner';
import { useAvailability, useServices, useStaffList } from '../hooks/useCatalog';
import { api, toApiError, type ApiError } from '../lib/api';
import {
  addDaysToDateInput,
  formatDate,
  formatLongDate,
  formatMoney,
  formatTime,
  todayInLima,
} from '../lib/format';
import type { AvailabilitySlot, Booking, StaffMember } from '../types/api';

export function BookingPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const servicesQuery = useServices();
  const [serviceId, setServiceId] = useState(searchParams.get('service') ?? '');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(addDaysToDateInput(todayInLima(), 1));
  const [slot, setSlot] = useState<string | null>(null);
  const [created, setCreated] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmedMessage, setConfirmedMessage] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  const service = servicesQuery.data?.find((item) => item.id === serviceId) ?? null;
  const staffQuery = useStaffList({ serviceId: serviceId || undefined });
  const availabilityQuery = useAvailability(serviceId || null, staffId || null, date);
  const effectiveSlot = availabilityQuery.data?.slots.some((item) => item.startAt === slot)
    ? slot
    : null;

  const resetIdempotencyKey = () => {
    idempotencyKey.current = null;
  };

  const selectService = (id: string) => {
    setServiceId(id);
    setStaffId('');
    setSlot(null);
    resetIdempotencyKey();
  };

  const selectStaff = (id: string) => {
    setStaffId(id);
    setSlot(null);
    resetIdempotencyKey();
  };

  const selectDate = (value: string) => {
    setDate(value);
    setSlot(null);
    resetIdempotencyKey();
  };

  const groupedSlots = useMemo(() => {
    const slots = availabilityQuery.data?.slots ?? [];
    return {
      morning: slots.filter((item) => Number(formatTime(item.startAt).slice(0, 2)) < 12),
      afternoon: slots.filter((item) => Number(formatTime(item.startAt).slice(0, 2)) >= 12),
    };
  }, [availabilityQuery.data]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!serviceId || !staffId || !effectiveSlot) {
        throw new Error('Completa los pasos para reservar.');
      }
      if (!idempotencyKey.current) {
        idempotencyKey.current = crypto.randomUUID();
      }

      const response = await api.post<{ booking: Booking; replayed: boolean }>(
        '/bookings',
        { serviceId, staffId, startAt: effectiveSlot },
        { headers: { 'Idempotency-Key': idempotencyKey.current } },
      );
      return response.data.booking;
    },
    onSuccess: (booking) => {
      setCreated(booking);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (mutationError) => {
      const apiError = toApiError(mutationError) as ApiError;
      if (apiError.code === 'SLOT_TAKEN') {
        idempotencyKey.current = null;
        setSlot(null);
        setError('Ese horario acaba de ocuparse. Elige otro y volvemos a intentar.');
        void queryClient.invalidateQueries({ queryKey: ['availability'] });
        return;
      }
      setError(apiError.message);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await api.post<{ booking: Booking }>(`/bookings/${bookingId}/confirm`);
      return response.data.booking;
    },
    onSuccess: (booking) => {
      setCreated(booking);
      setConfirmedMessage('Reserva confirmada. Te esperamos.');
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (mutationError) => {
      setError(toApiError(mutationError).message);
    },
  });

  if (created) {
    return (
      <div className="container-page py-10 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-700">
            {created.status === 'CONFIRMED' ? 'Reserva confirmada' : 'Reserva creada'}
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink">
            {created.status === 'CONFIRMED' ? 'Nos vemos pronto.' : 'Tu espacio está casi listo.'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/60">
            {created.status === 'CONFIRMED'
              ? 'Guarda la fecha. Si algo cambia, puedes cancelar hasta 24 horas antes.'
              : 'Confirma tu reserva para asegurar el horario. La reserva pendiente vence a las ' +
                `${formatTime(created.expiresAt)}.`}
          </p>

          {confirmedMessage ? (
            <Alert tone="success" className="mt-6">
              {confirmedMessage}
            </Alert>
          ) : null}
          {error ? (
            <Alert tone="error" className="mt-6">
              {error}
            </Alert>
          ) : null}

          <div className="mt-8 rounded-3xl border border-sand-200 bg-white/80 p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-sage-50 px-3 py-1 text-xs font-semibold text-sage-800">
                {created.status === 'CONFIRMED' ? 'Confirmada' : 'Pendiente'}
              </span>
              <span className="text-sm text-ink/50">{created.service.durationMinutes} min</span>
            </div>
            <h2 className="mt-5 font-display text-3xl text-ink">{created.service.name}</h2>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-ink/45">Fecha</dt>
                <dd className="mt-1 font-semibold text-ink">{formatLongDate(created.startAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-ink/45">Hora</dt>
                <dd className="mt-1 font-semibold text-ink">
                  {formatTime(created.startAt)} – {formatTime(created.endAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-ink/45">Terapeuta</dt>
                <dd className="mt-1 font-semibold text-ink">{created.staff.fullName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-ink/45">Total</dt>
                <dd className="mt-1 font-semibold text-ink">
                  {formatMoney(created.service.priceCents)}
                </dd>
              </div>
            </dl>

            <div className="mt-7 flex flex-wrap gap-3">
              {created.status === 'PENDING' ? (
                <Button
                  onClick={() => confirmMutation.mutate(created.id)}
                  loading={confirmMutation.isPending}
                >
                  Confirmar reserva
                </Button>
              ) : null}
              <Link to="/mis-reservas" className={buttonStyles('secondary', 'md')}>
                Ver mis reservas
              </Link>
              {created.status === 'PENDING' ? (
                <Link to="/reservar" className={buttonStyles('ghost', 'md')}>
                  Elegir otro horario
                </Link>
              ) : null}
            </div>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-ink/45">
            Si no confirmas la reserva pendiente, el horario se libera automáticamente después de
            unos minutos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader
        eyebrow="Reservar"
        title="Diseña tu pausa."
        description="Elige el ritual, la persona y el horario. Solo verás espacios realmente disponibles."
      />

      {error ? (
        <Alert tone="error" className="mt-6">
          {error}
        </Alert>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-6">
          <section className="rounded-3xl border border-sand-200 bg-white/75 p-5 sm:p-6">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-2xl text-sage-400">01</span>
              <h2 className="font-display text-2xl text-ink">Elige tu ritual</h2>
            </div>
            {servicesQuery.isLoading ? (
              <div className="mt-5">
                <Spinner />
              </div>
            ) : servicesQuery.isError ? (
              <Alert tone="error" className="mt-5">
                No pudimos cargar los servicios.
              </Alert>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {servicesQuery.data?.map((item) => {
                  const selected = item.id === serviceId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => selectService(item.id)}
                      className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 ${
                        selected
                          ? 'border-sage-600 bg-sage-50'
                          : 'border-sand-200 bg-white hover:border-sage-300'
                      }`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-semibold text-ink">{item.name}</span>
                        <span className="whitespace-nowrap text-sm font-semibold text-sage-800">
                          {formatMoney(item.priceCents)}
                        </span>
                      </span>
                      <span className="mt-2 block text-xs text-ink/55">
                        {item.durationMinutes} min · {item.description ?? 'Ritual de spa'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-sand-200 bg-white/75 p-5 sm:p-6">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-2xl text-sage-400">02</span>
              <h2 className="font-display text-2xl text-ink">Elige a tu terapeuta</h2>
            </div>
            {!serviceId ? (
              <p className="mt-4 text-sm text-ink/55">Primero elige un ritual.</p>
            ) : staffQuery.isLoading ? (
              <div className="mt-5">
                <Spinner />
              </div>
            ) : staffQuery.data?.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {staffQuery.data.map((member: StaffMember) => {
                  const selected = member.id === staffId;
                  return (
                    <button
                      key={member.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => selectStaff(member.id)}
                      className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 ${
                        selected
                          ? 'border-sage-600 bg-sage-50'
                          : 'border-sand-200 bg-white hover:border-sage-300'
                      }`}
                    >
                      <span className="font-semibold text-ink">{member.fullName}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-ink/55">
                        {member.bio ?? 'Atención personalizada.'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink/55">
                No hay terapeutas disponibles para este ritual.
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-sand-200 bg-white/75 p-5 sm:p-6">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-2xl text-sage-400">03</span>
              <h2 className="font-display text-2xl text-ink">Elige fecha y hora</h2>
            </div>
            <div className="mt-5 max-w-xs">
              <Field label="Fecha" htmlFor="booking-date">
                <Input
                  id="booking-date"
                  type="date"
                  min={todayInLima()}
                  max={addDaysToDateInput(todayInLima(), 60)}
                  value={date}
                  onChange={(event) => selectDate(event.target.value)}
                />
              </Field>
            </div>

            {!serviceId || !staffId ? (
              <p className="mt-5 text-sm text-ink/55">
                Elige ritual y terapeuta para ver horarios.
              </p>
            ) : availabilityQuery.isLoading ? (
              <div className="mt-5">
                <Spinner label="Buscando espacios" />
              </div>
            ) : availabilityQuery.isError ? (
              <Alert tone="error" className="mt-5">
                No pudimos consultar la disponibilidad. Intenta con otra fecha.
              </Alert>
            ) : availabilityQuery.data?.slots.length ? (
              <div className="mt-6 space-y-5">
                {(
                  [
                    ['Mañana', groupedSlots.morning],
                    ['Tarde', groupedSlots.afternoon],
                  ] as const
                ).map(([label, slots]) =>
                  slots.length ? (
                    <div key={label}>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">
                        {label}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {slots.map((item: AvailabilitySlot) => {
                          const selected = slot === item.startAt;
                          return (
                            <button
                              key={item.startAt}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => {
                                setSlot(item.startAt);
                                resetIdempotencyKey();
                              }}
                              className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 ${
                                selected
                                  ? 'border-sage-700 bg-sage-700 text-white'
                                  : 'border-sand-300 bg-white text-ink hover:border-sage-400'
                              }`}
                            >
                              {formatTime(item.startAt)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            ) : (
              <EmptyState
                title="No quedan horarios ese día"
                description="Prueba con otra fecha o con otro terapeuta. La disponibilidad se actualiza en tiempo real."
              />
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-3xl border border-sand-200 bg-sand-100/80 p-6 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sage-700">Tu reserva</p>
            {service ? (
              <>
                <h2 className="mt-3 font-display text-2xl leading-tight text-ink">
                  {service.name}
                </h2>
                <p className="mt-1 text-sm text-ink/55">{service.durationMinutes} minutos</p>
                <dl className="mt-5 space-y-3 border-t border-sand-300/70 pt-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/55">Terapeuta</dt>
                    <dd className="text-right font-semibold text-ink">
                      {staffQuery.data?.find((member) => member.id === staffId)?.fullName ??
                        'Por elegir'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/55">Fecha</dt>
                    <dd className="text-right font-semibold text-ink">
                      {date ? formatDate(`${date}T12:00:00-05:00`) : 'Por elegir'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/55">Hora</dt>
                    <dd className="text-right font-semibold text-ink">
                      {effectiveSlot ? formatTime(effectiveSlot) : 'Por elegir'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-sand-300/70 pt-3">
                    <dt className="text-ink/55">Total</dt>
                    <dd className="text-right font-display text-xl text-ink">
                      {formatMoney(service.priceCents)}
                    </dd>
                  </div>
                </dl>
                <Button
                  className="mt-6 w-full"
                  size="lg"
                  disabled={!staffId || !effectiveSlot}
                  loading={createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  Reservar
                </Button>
                <p className="mt-3 text-xs leading-relaxed text-ink/45">
                  Crearemos una reserva pendiente. Tendrás unos minutos para confirmarla.
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-ink/55">
                Elige un ritual para ver el resumen de tu reserva.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
