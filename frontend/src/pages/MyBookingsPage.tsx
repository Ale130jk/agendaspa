import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { buttonStyles } from '../lib/buttonStyles';
import { EmptyState, PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/Modal';
import { Spinner } from '../components/Spinner';
import { StatusBadge } from '../components/StatusBadge';
import { useMyBookings } from '../hooks/useBookings';
import { api, toApiError } from '../lib/api';
import { canClientCancel, formatDateTime, formatMoney, formatTime, isFuture } from '../lib/format';
import type { Booking } from '../types/api';

export function MyBookingsPage() {
  const queryClient = useQueryClient();
  const bookingsQuery = useMyBookings();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  const actionMutation = useMutation({
    mutationFn: async ({ booking, action }: { booking: Booking; action: 'confirm' | 'cancel' }) => {
      const response = await api.post<{ booking: Booking }>(`/bookings/${booking.id}/${action}`);
      return response.data.booking;
    },
    onSuccess: (booking, variables) => {
      setError(null);
      setMessage(
        variables.action === 'confirm'
          ? 'Reserva confirmada. Te esperamos.'
          : 'Reserva cancelada. El horario volvió a estar disponible.',
      );
      setCancelTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
      if (booking.status === 'CANCELLED') {
        setMessage('Reserva cancelada. El horario volvió a estar disponible.');
      }
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(toApiError(mutationError).message);
      setCancelTarget(null);
    },
  });

  const { upcoming, history } = useMemo(() => {
    const bookings = bookingsQuery.data?.data ?? [];
    return {
      upcoming: bookings.filter(
        (booking) =>
          (booking.status === 'PENDING' || booking.status === 'CONFIRMED') &&
          isFuture(booking.endAt),
      ),
      history: bookings.filter(
        (booking) =>
          booking.status === 'CANCELLED' ||
          booking.status === 'COMPLETED' ||
          !isFuture(booking.endAt),
      ),
    };
  }, [bookingsQuery.data]);

  const busyBookingId = actionMutation.isPending ? actionMutation.variables?.booking.id : null;

  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader
        eyebrow="Tu cuenta"
        title="Mis reservas."
        description="Confirma tus reservas pendientes, revisa tus próximas citas y consulta tu historial."
        actions={
          <Link to="/reservar" className={buttonStyles('primary', 'md')}>
            Reservar otro ritual
          </Link>
        }
      />

      {message ? (
        <Alert tone="success" className="mt-6">
          {message}
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="error" className="mt-6">
          {error}
        </Alert>
      ) : null}

      {bookingsQuery.isLoading ? (
        <div className="mt-10">
          <Spinner label="Cargando tus reservas" />
        </div>
      ) : bookingsQuery.isError ? (
        <Alert tone="error" className="mt-10">
          No pudimos cargar tus reservas. Intenta de nuevo.
        </Alert>
      ) : (
        <div className="mt-10 space-y-12">
          <section aria-labelledby="upcoming-title">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="upcoming-title" className="font-display text-2xl text-ink">
                  Próximas
                </h2>
                <p className="mt-1 text-sm text-ink/55">Reservas pendientes o confirmadas.</p>
              </div>
              <span className="text-sm text-ink/45">{upcoming.length}</span>
            </div>

            {upcoming.length ? (
              <div className="mt-5 grid gap-4">
                {upcoming.map((booking) => {
                  const isPendingExpired =
                    booking.status === 'PENDING' && !isFuture(booking.expiresAt);
                  return (
                    <article
                      key={booking.id}
                      className="rounded-3xl border border-sand-200 bg-white/80 p-5 shadow-soft"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <StatusBadge status={booking.status} />
                            <span className="text-xs text-ink/45">
                              {booking.service.durationMinutes} min
                            </span>
                          </div>
                          <h3 className="mt-3 font-display text-2xl text-ink">
                            {booking.service.name}
                          </h3>
                          <p className="mt-1 text-sm text-ink/60">
                            {formatDateTime(booking.startAt)} · {booking.staff.fullName}
                          </p>
                          {booking.status === 'PENDING' ? (
                            <p className="mt-2 text-xs font-medium text-amber-800">
                              {isPendingExpired
                                ? 'Esta reserva pendiente está por liberarse. Elige otro horario.'
                                : `Confirma antes de las ${formatTime(booking.expiresAt)} para asegurar el espacio.`}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <span className="mr-2 font-display text-xl text-ink">
                            {formatMoney(booking.service.priceCents)}
                          </span>
                          {booking.status === 'PENDING' && !isPendingExpired ? (
                            <Button
                              size="sm"
                              onClick={() => actionMutation.mutate({ booking, action: 'confirm' })}
                              loading={
                                busyBookingId === booking.id &&
                                actionMutation.variables?.action === 'confirm'
                              }
                            >
                              Confirmar
                            </Button>
                          ) : null}
                          {canClientCancel(booking) && !isPendingExpired ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setCancelTarget(booking)}
                            >
                              Cancelar
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Sin reservas próximas"
                description="Tu agenda está libre. Elige un ritual y reserva el espacio que mejor te acomode."
                action={
                  <Link to="/reservar" className={buttonStyles('primary', 'md')}>
                    Reservar un ritual
                  </Link>
                }
              />
            )}
          </section>

          <section aria-labelledby="history-title">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="history-title" className="font-display text-2xl text-ink">
                  Historial
                </h2>
                <p className="mt-1 text-sm text-ink/55">Reservas completadas o canceladas.</p>
              </div>
              <span className="text-sm text-ink/45">{history.length}</span>
            </div>

            {history.length ? (
              <div className="mt-5 grid gap-3">
                {history.map((booking) => (
                  <article
                    key={booking.id}
                    className="flex flex-col gap-3 rounded-2xl border border-sand-200 bg-white/55 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={booking.status} />
                        <span className="text-xs text-ink/45">
                          {formatDateTime(booking.startAt)}
                        </span>
                      </div>
                      <p className="mt-2 font-semibold text-ink">{booking.service.name}</p>
                      <p className="text-sm text-ink/50">{booking.staff.fullName}</p>
                    </div>
                    <p className="text-sm font-semibold text-ink/70">
                      {formatMoney(booking.service.priceCents)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-sand-300 px-5 py-6 text-sm text-ink/50">
                Aún no hay historial. Tus reservas completadas o canceladas aparecerán aquí.
              </p>
            )}
          </section>

          {upcoming.some((booking) => isFuture(booking.startAt)) ? (
            <p className="text-xs leading-relaxed text-ink/40">
              Puedes cancelar una reserva hasta 24 horas antes de la hora de inicio. Si la ventana
              ya cerró, escríbenos al spa para revisar tu caso.
            </p>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="¿Cancelar esta reserva?"
        description={
          cancelTarget
            ? `${cancelTarget.service.name} · ${formatDateTime(cancelTarget.startAt)}. El horario volverá a estar disponible para otras personas.`
            : ''
        }
        confirmLabel="Sí, cancelar"
        cancelLabel="Mantener reserva"
        tone="danger"
        loading={actionMutation.isPending}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => {
          if (cancelTarget) {
            actionMutation.mutate({ booking: cancelTarget, action: 'cancel' });
          }
        }}
      />
    </div>
  );
}
