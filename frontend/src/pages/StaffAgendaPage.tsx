import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Field, Input, Select } from '../components/Field';
import { EmptyState, PageHeader } from '../components/PageHeader';
import { Spinner } from '../components/Spinner';
import { StatusBadge } from '../components/StatusBadge';
import { useAgenda } from '../hooks/useBookings';
import { useStaffList } from '../hooks/useCatalog';
import { useAuth } from '../lib/auth-context';
import { buttonStyles } from '../lib/buttonStyles';
import {
  addDaysToDateInput,
  formatDate,
  formatLongDate,
  formatTime,
  todayInLima,
} from '../lib/format';
import type { Booking } from '../types/api';

function startOfDay(date: string): string {
  return new Date(`${date}T00:00:00-05:00`).toISOString();
}

function endOfDay(date: string): string {
  return new Date(`${date}T23:59:59-05:00`).toISOString();
}

function dateKey(value: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export function StaffAgendaPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const staffQuery = useStaffList({ includeInactive: true });
  const [fromDate, setFromDate] = useState(todayInLima());
  const [toDate, setToDate] = useState(addDaysToDateInput(todayInLima(), 7));
  const [staffId, setStaffId] = useState('');

  const agendaQuery = useAgenda(
    startOfDay(fromDate),
    endOfDay(toDate),
    isAdmin && staffId ? staffId : undefined,
  );

  const groups = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const booking of agendaQuery.data ?? []) {
      const key = dateKey(booking.startAt);
      const list = map.get(key) ?? [];
      list.push(booking);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [agendaQuery.data]);

  const updateFrom = (value: string) => {
    setFromDate(value);
    if (value > toDate) {
      setToDate(addDaysToDateInput(value, 7));
    } else if (toDate > addDaysToDateInput(value, 30)) {
      setToDate(addDaysToDateInput(value, 30));
    }
  };

  const updateTo = (value: string) => {
    setToDate(value);
  };

  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader
        eyebrow={isAdmin ? 'Agenda del equipo' : 'Mi agenda'}
        title="Tu semana, en orden."
        description={
          isAdmin
            ? 'Consulta la agenda del equipo. La edición de reservas vive en el panel de administración.'
            : 'Consulta tus próximas citas. La agenda es de solo lectura.'
        }
        actions={
          isAdmin ? (
            <Link to="/admin/reservas" className={buttonStyles('primary', 'md')}>
              Gestionar reservas
            </Link>
          ) : (
            <span className="rounded-full border border-sand-300 bg-white/70 px-3 py-2 text-xs font-semibold text-ink/55">
              Solo lectura
            </span>
          )
        }
      />

      <div className="mt-7 grid gap-3 rounded-3xl border border-sand-200 bg-white/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Desde" htmlFor="agenda-from">
          <Input
            id="agenda-from"
            type="date"
            value={fromDate}
            onChange={(event) => updateFrom(event.target.value)}
          />
        </Field>
        <Field label="Hasta" htmlFor="agenda-to" hint="Máximo 31 días">
          <Input
            id="agenda-to"
            type="date"
            value={toDate}
            min={fromDate}
            max={addDaysToDateInput(fromDate, 30)}
            onChange={(event) => updateTo(event.target.value)}
          />
        </Field>
        {isAdmin ? (
          <Field label="Staff" htmlFor="agenda-staff">
            <Select
              id="agenda-staff"
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
        ) : null}
        <div className="flex items-end">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setFromDate(todayInLima());
              setToDate(addDaysToDateInput(todayInLima(), 7));
              setStaffId('');
            }}
          >
            Esta semana
          </Button>
        </div>
      </div>

      {agendaQuery.isLoading ? (
        <div className="mt-8">
          <Spinner label="Cargando agenda" />
        </div>
      ) : agendaQuery.isError ? (
        <Alert tone="error" className="mt-8">
          No pudimos cargar la agenda. Revisa el rango de fechas e intenta de nuevo.
        </Alert>
      ) : groups.length ? (
        <div className="mt-8 space-y-8">
          {groups.map(([date, bookings]) => (
            <section key={date} aria-labelledby={`agenda-${date}`}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 id={`agenda-${date}`} className="font-display text-2xl text-ink">
                    {formatLongDate(`${date}T12:00:00-05:00`)}
                  </h2>
                  <p className="text-sm text-ink/45">{formatDate(`${date}T12:00:00-05:00`)}</p>
                </div>
                <span className="text-sm text-ink/45">
                  {bookings.length} {bookings.length === 1 ? 'reserva' : 'reservas'}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                {bookings.map((booking) => (
                  <article
                    key={booking.id}
                    className="grid gap-3 rounded-2xl border border-sand-200 bg-white/75 p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center"
                  >
                    <div className="font-display text-xl text-sage-800">
                      {formatTime(booking.startAt)} – {formatTime(booking.endAt)}
                    </div>
                    <div>
                      <p className="font-semibold text-ink">{booking.service.name}</p>
                      <p className="text-sm text-ink/55">
                        {booking.client.fullName} · {booking.staff.fullName}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="Sin citas en este rango"
            description="No hay reservas activas para las fechas seleccionadas. Prueba ampliando el rango o revisando otra semana."
          />
        </div>
      )}

      <p className="mt-8 text-xs leading-relaxed text-ink/40">
        Las reservas canceladas no se muestran en esta vista. La agenda usa la zona horaria
        America/Lima.
      </p>
    </div>
  );
}
