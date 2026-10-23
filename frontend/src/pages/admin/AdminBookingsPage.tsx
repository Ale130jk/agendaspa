import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { Field, Input, Select } from '../../components/Field';
import { EmptyState, PageHeader } from '../../components/PageHeader';
import { ConfirmDialog } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { StatusBadge } from '../../components/StatusBadge';
import { useBookings } from '../../hooks/useBookings';
import { useStaffList } from '../../hooks/useCatalog';
import { api, toApiError } from '../../lib/api';
import {
  addDaysToDateInput,
  formatDateTime,
  formatMoney,
  isFuture,
  todayInLima,
} from '../../lib/format';
import type { Booking } from '../../types/api';

function startOfDay(date: string): string {
  return new Date(`${date}T00:00:00-05:00`).toISOString();
}

export function AdminBookingsPage() {
  const queryClient = useQueryClient();
  const staffQuery = useStaffList({ includeInactive: true });
  const [status, setStatus] = useState('');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  const filters = useMemo(
    () => ({
      ...(status ? { status } : {}),
      ...(staffId ? { staffId } : {}),
      ...(date ? { from: startOfDay(date), to: startOfDay(addDaysToDateInput(date, 1)) } : {}),
      limit: 50,
    }),
    [date, staffId, status],
  );

  const bookingsQuery = useBookings(filters);
  const bookings = bookingsQuery.data?.data ?? [];

  const actionMutation = useMutation({
    mutationFn: async ({
      booking,
      action,
    }: {
      booking: Booking;
      action: 'confirm' | 'cancel' | 'complete';
    }) => {
      await api.post(`/bookings/${booking.id}/${action}`);
    },
    onSuccess: (_data, variables) => {
      setMessage(
        variables.action === 'confirm'
          ? 'Reserva confirmada.'
          : variables.action === 'cancel'
            ? 'Reserva cancelada.'
            : 'Reserva completada.',
      );
      setError(null);
      setCancelTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['agenda'] });
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(toApiError(mutationError).message);
      setCancelTarget(null);
    },
  });

  const busyId = actionMutation.isPending ? actionMutation.variables?.booking.id : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reservas"
        title="Todas las reservas."
        description="Confirma, cancela o completa citas. El equipo tiene acceso de solo lectura a su agenda."
      />

      {message ? <Alert tone="success">{message}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-3 rounded-3xl border border-sand-200 bg-white/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Estado" htmlFor="filter-status">
          <Select
            id="filter-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="CONFIRMED">Confirmada</option>
            <option value="COMPLETED">Completada</option>
            <option value="CANCELLED">Cancelada</option>
          </Select>
        </Field>
        <Field label="Staff" htmlFor="filter-staff">
          <Select
            id="filter-staff"
            value={staffId}
            onChange={(event) => setStaffId(event.target.value)}
          >
            <option value="">Todo el equipo</option>
            {staffQuery.data?.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Día" htmlFor="filter-date" hint="Hora de Lima">
          <Input
            id="filter-date"
            type="date"
            value={date}
            max={addDaysToDateInput(todayInLima(), 365)}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <div className="flex items-end">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setStatus('');
              setStaffId('');
              setDate('');
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      </div>

      {bookingsQuery.isLoading ? (
        <Spinner label="Cargando reservas" />
      ) : bookingsQuery.isError ? (
        <Alert tone="error">No pudimos cargar las reservas.</Alert>
      ) : bookings.length ? (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const canComplete = booking.status === 'CONFIRMED' && !isFuture(booking.startAt);
            return (
              <article
                key={booking.id}
                className="rounded-3xl border border-sand-200 bg-white/75 p-5 shadow-soft"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge status={booking.status} />
                      <span className="text-xs text-ink/45">{formatDateTime(booking.startAt)}</span>
                    </div>
                    <h2 className="mt-3 font-display text-2xl text-ink">{booking.service.name}</h2>
                    <p className="mt-1 text-sm text-ink/55">
                      {booking.client.fullName} · {booking.client.email}
                    </p>
                    <p className="mt-1 text-sm text-ink/55">
                      Terapeuta: {booking.staff.fullName} · {booking.service.durationMinutes} min
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-2 font-display text-xl text-ink">
                      {formatMoney(booking.service.priceCents)}
                    </span>
                    {booking.status === 'PENDING' ? (
                      <>
                        <Button
                          size="sm"
                          loading={
                            busyId === booking.id && actionMutation.variables?.action === 'confirm'
                          }
                          onClick={() => actionMutation.mutate({ booking, action: 'confirm' })}
                        >
                          Confirmar
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setCancelTarget(booking)}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : null}
                    {booking.status === 'CONFIRMED' ? (
                      <>
                        <Button
                          size="sm"
                          disabled={!canComplete}
                          title={
                            canComplete
                              ? undefined
                              : 'Solo puedes completar una reserva después de su hora de inicio'
                          }
                          loading={
                            busyId === booking.id && actionMutation.variables?.action === 'complete'
                          }
                          onClick={() => actionMutation.mutate({ booking, action: 'complete' })}
                        >
                          Completar
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setCancelTarget(booking)}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Sin reservas con estos filtros"
          description="Prueba con otro estado, otro día o limpia los filtros para ver toda la agenda."
        />
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="¿Cancelar esta reserva?"
        description={
          cancelTarget
            ? `${cancelTarget.service.name} de ${cancelTarget.client.fullName} · ${formatDateTime(cancelTarget.startAt)}. El horario volverá a estar disponible.`
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
