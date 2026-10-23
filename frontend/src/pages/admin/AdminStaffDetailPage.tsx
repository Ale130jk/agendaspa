import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { Card, EmptyState, PageHeader } from '../../components/PageHeader';
import { Field, Input, Select } from '../../components/Field';
import { ConfirmDialog } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { useStaffMember, useTimeOff, useWorkingHours } from '../../hooks/useCatalog';
import { api, toApiError } from '../../lib/api';
import { WEEKDAYS, formatDateTime, minutesToTime, timeToMinutes } from '../../lib/format';
import type { TimeOff, WorkingHour } from '../../types/api';

export function AdminStaffDetailPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const queryClient = useQueryClient();
  const staffQuery = useStaffMember(staffId);
  const hoursQuery = useWorkingHours(staffId);
  const timeOffQuery = useTimeOff(staffId);

  const [hoursDraft, setHoursDraft] = useState<WorkingHour[] | null>(null);
  const hours = hoursDraft ?? hoursQuery.data ?? [];
  const [timeOffForm, setTimeOffForm] = useState({ startAt: '', endAt: '', reason: '' });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimeOff | null>(null);

  const saveHoursMutation = useMutation({
    mutationFn: async () => {
      if (!staffId) return;
      await api.put(`/staff/${staffId}/working-hours`, {
        hours: hours.map((hour) => ({
          weekday: hour.weekday,
          startMinute: hour.startMinute,
          endMinute: hour.endMinute,
        })),
      });
    },
    onSuccess: () => {
      setMessage('Horario actualizado. La disponibilidad ya refleja el cambio.');
      setError(null);
      setHoursDraft(null);
      void queryClient.invalidateQueries({ queryKey: ['working-hours', staffId] });
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (mutationError) => {
      setError(toApiError(mutationError).message);
    },
  });

  const createTimeOffMutation = useMutation({
    mutationFn: async () => {
      if (!staffId) return;
      await api.post(`/staff/${staffId}/time-off`, {
        startAt: new Date(timeOffForm.startAt).toISOString(),
        endAt: new Date(timeOffForm.endAt).toISOString(),
        reason: timeOffForm.reason.trim() || undefined,
      });
    },
    onSuccess: () => {
      setMessage('Ausencia registrada. El horario quedó bloqueado.');
      setError(null);
      setTimeOffForm({ startAt: '', endAt: '', reason: '' });
      void queryClient.invalidateQueries({ queryKey: ['time-off', staffId] });
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (mutationError) => {
      setError(toApiError(mutationError).message);
    },
  });

  const deleteTimeOffMutation = useMutation({
    mutationFn: async (timeOff: TimeOff) => {
      if (!staffId) return;
      await api.delete(`/staff/${staffId}/time-off/${timeOff.id}`);
    },
    onSuccess: () => {
      setMessage('Ausencia eliminada. El horario volvió a estar disponible.');
      setError(null);
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['time-off', staffId] });
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (mutationError) => {
      setError(toApiError(mutationError).message);
      setDeleteTarget(null);
    },
  });

  if (staffQuery.isLoading) {
    return <Spinner label="Cargando integrante" />;
  }

  if (staffQuery.isError || !staffQuery.data) {
    return (
      <Alert tone="error">
        No pudimos cargar a este integrante. <Link to="/admin/staff">Volver al equipo</Link>.
      </Alert>
    );
  }

  const staff = staffQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/staff" className="text-sm font-semibold text-sage-800 hover:text-sage-900">
          ← Volver al equipo
        </Link>
      </div>

      <PageHeader
        eyebrow="Horario y ausencias"
        title={staff.fullName}
        description={staff.bio ?? 'Sin biografía todavía.'}
      />

      {message ? <Alert tone="success">{message}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-ink">Horario semanal</h2>
              <p className="mt-1 text-sm text-ink/55">
                Zona horaria America/Lima. Puedes agregar más de un bloque por día.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setHoursDraft([...hours, { weekday: 1, startMinute: 9 * 60, endMinute: 18 * 60 }])
              }
            >
              Agregar bloque
            </Button>
          </div>

          {hoursQuery.isLoading ? (
            <div className="mt-6">
              <Spinner />
            </div>
          ) : hours.length ? (
            <div className="mt-5 space-y-3">
              {hours.map((hour, index) => (
                <div
                  key={`${hour.weekday}-${index}`}
                  className="grid gap-3 rounded-2xl border border-sand-200 bg-white/60 p-3 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-end"
                >
                  <Field label="Día" htmlFor={`weekday-${index}`}>
                    <Select
                      id={`weekday-${index}`}
                      value={hour.weekday}
                      onChange={(event) => {
                        const weekday = Number(event.target.value);
                        setHoursDraft(
                          hours.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, weekday } : item,
                          ),
                        );
                      }}
                    >
                      {WEEKDAYS.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Inicio" htmlFor={`start-${index}`}>
                    <Input
                      id={`start-${index}`}
                      type="time"
                      value={minutesToTime(hour.startMinute)}
                      onChange={(event) => {
                        const startMinute = timeToMinutes(event.target.value);
                        setHoursDraft(
                          hours.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, startMinute } : item,
                          ),
                        );
                      }}
                    />
                  </Field>
                  <Field label="Fin" htmlFor={`end-${index}`}>
                    <Input
                      id={`end-${index}`}
                      type="time"
                      value={minutesToTime(hour.endMinute)}
                      onChange={(event) => {
                        const endMinute = timeToMinutes(event.target.value);
                        setHoursDraft(
                          hours.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, endMinute } : item,
                          ),
                        );
                      }}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setHoursDraft(hours.filter((_, i) => i !== index))}
                    aria-label={`Eliminar bloque del ${WEEKDAYS[hour.weekday - 1]?.label ?? 'día'}`}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-sand-300 px-4 py-5 text-sm text-ink/50">
              Sin horario configurado. Agrega un bloque para que este integrante reciba reservas.
            </p>
          )}

          <div className="mt-5 flex justify-end">
            <Button
              onClick={() => saveHoursMutation.mutate()}
              loading={saveHoursMutation.isPending}
              disabled={hoursQuery.isLoading}
            >
              Guardar horario
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="font-display text-2xl text-ink">Registrar ausencia</h2>
            <p className="mt-1 text-sm text-ink/55">
              Bloquea un rango para citas médicas, vacaciones o descansos.
            </p>
            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setError(null);
                if (!timeOffForm.startAt || !timeOffForm.endAt) {
                  setError('Indica inicio y fin de la ausencia.');
                  return;
                }
                if (new Date(timeOffForm.endAt) <= new Date(timeOffForm.startAt)) {
                  setError('El fin debe ser posterior al inicio.');
                  return;
                }
                createTimeOffMutation.mutate();
              }}
            >
              <Field label="Inicio" htmlFor="time-off-start">
                <Input
                  id="time-off-start"
                  type="datetime-local"
                  value={timeOffForm.startAt}
                  onChange={(event) =>
                    setTimeOffForm((current) => ({ ...current, startAt: event.target.value }))
                  }
                />
              </Field>
              <Field label="Fin" htmlFor="time-off-end">
                <Input
                  id="time-off-end"
                  type="datetime-local"
                  value={timeOffForm.endAt}
                  onChange={(event) =>
                    setTimeOffForm((current) => ({ ...current, endAt: event.target.value }))
                  }
                />
              </Field>
              <Field label="Motivo (opcional)" htmlFor="time-off-reason">
                <Input
                  id="time-off-reason"
                  placeholder="Cita médica"
                  value={timeOffForm.reason}
                  onChange={(event) =>
                    setTimeOffForm((current) => ({ ...current, reason: event.target.value }))
                  }
                />
              </Field>
              <Button type="submit" className="w-full" loading={createTimeOffMutation.isPending}>
                Registrar ausencia
              </Button>
            </form>
          </Card>

          <Card>
            <h2 className="font-display text-2xl text-ink">Ausencias registradas</h2>
            {timeOffQuery.isLoading ? (
              <div className="mt-4">
                <Spinner />
              </div>
            ) : timeOffQuery.data?.length ? (
              <div className="mt-4 divide-y divide-sand-200">
                {timeOffQuery.data.map((timeOff) => (
                  <div
                    key={timeOff.id}
                    className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {formatDateTime(timeOff.startAt)} → {formatDateTime(timeOff.endAt)}
                      </p>
                      <p className="text-xs text-ink/50">
                        {timeOff.reason ?? 'Sin motivo indicado'}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(timeOff)}>
                      Eliminar
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Sin ausencias"
                description="No hay bloqueos registrados para este integrante."
              />
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="¿Eliminar esta ausencia?"
        description="El rango volverá a estar disponible para reservas. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        tone="danger"
        loading={deleteTimeOffMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteTimeOffMutation.mutate(deleteTarget);
          }
        }}
      />
    </div>
  );
}
