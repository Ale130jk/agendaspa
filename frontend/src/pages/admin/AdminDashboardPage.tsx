import { Link } from 'react-router-dom';
import { Alert } from '../../components/Alert';
import { Card, EmptyState, PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { StatusBadge } from '../../components/StatusBadge';
import { buttonStyles } from '../../lib/buttonStyles';
import { useBookings } from '../../hooks/useBookings';
import { useServices, useStaffList } from '../../hooks/useCatalog';
import { addDaysToDateInput, formatDateTime, todayInLima } from '../../lib/format';

function startOfDay(date: string): string {
  return new Date(`${date}T00:00:00-05:00`).toISOString();
}

export function AdminDashboardPage() {
  const servicesQuery = useServices(true);
  const staffQuery = useStaffList({ includeInactive: true });
  const today = todayInLima();
  const bookingsQuery = useBookings({
    from: startOfDay(today),
    to: startOfDay(addDaysToDateInput(today, 1)),
    limit: 50,
  });

  const activeServices = servicesQuery.data?.filter((service) => service.isActive).length ?? 0;
  const activeStaff = staffQuery.data?.filter((member) => member.isActive).length ?? 0;
  const todayBookings = bookingsQuery.data?.data ?? [];
  const pending = todayBookings.filter((booking) => booking.status === 'PENDING').length;
  const confirmed = todayBookings.filter((booking) => booking.status === 'CONFIRMED').length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Resumen"
        title="Lo que necesita atención hoy."
        description="Una vista rápida del catálogo, el equipo y la agenda del día."
        actions={
          <Link to="/admin/reservas" className={buttonStyles('primary', 'md')}>
            Ver reservas
          </Link>
        }
      />

      {bookingsQuery.isError ? (
        <Alert tone="error">No pudimos cargar la agenda de hoy.</Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Servicios activos', value: activeServices, to: '/admin/servicios' },
          { label: 'Staff activo', value: activeStaff, to: '/admin/staff' },
          { label: 'Reservas hoy', value: todayBookings.length, to: '/admin/reservas' },
          { label: 'Por confirmar', value: pending, to: '/admin/reservas' },
        ].map((stat) => (
          <Link
            key={stat.label}
            to={stat.to}
            className="rounded-3xl border border-sand-200 bg-white/75 p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-sage-300"
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sage-700">
              {stat.label}
            </p>
            <p className="mt-3 font-display text-4xl text-ink">{stat.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl text-ink">Agenda de hoy</h2>
              <p className="mt-1 text-sm text-ink/55">{today} · Hora de Lima</p>
            </div>
            {bookingsQuery.isFetching ? <Spinner label="Actualizando" /> : null}
          </div>

          {bookingsQuery.isLoading ? (
            <div className="mt-6">
              <Spinner />
            </div>
          ) : todayBookings.length ? (
            <div className="mt-5 divide-y divide-sand-200">
              {todayBookings.slice(0, 8).map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {formatDateTime(booking.startAt)} · {booking.service.name}
                    </p>
                    <p className="text-sm text-ink/50">
                      {booking.client.fullName} con {booking.staff.fullName}
                    </p>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin reservas hoy"
              description="La agenda está despejada. Puedes revisar los próximos días en la sección de reservas."
            />
          )}
        </Card>

        <div className="space-y-4">
          <Card className="bg-sage-800 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sage-200">Hoy</p>
            <p className="mt-3 font-display text-4xl">{confirmed}</p>
            <p className="mt-1 text-sm text-sage-100/70">reservas confirmadas</p>
            <Link
              to="/agenda"
              className="mt-5 inline-flex min-h-10 items-center rounded-full border border-white/25 px-4 text-sm font-semibold transition hover:bg-white/10"
            >
              Abrir agenda →
            </Link>
          </Card>

          <Card>
            <h2 className="font-display text-2xl text-ink">Atajos</h2>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <Link
                to="/admin/servicios"
                className="rounded-xl px-2 py-2 text-ink/65 hover:bg-sand-100 hover:text-ink"
              >
                Editar servicios y precios
              </Link>
              <Link
                to="/admin/staff"
                className="rounded-xl px-2 py-2 text-ink/65 hover:bg-sand-100 hover:text-ink"
              >
                Revisar horarios del equipo
              </Link>
              <Link
                to="/admin/reservas"
                className="rounded-xl px-2 py-2 text-ink/65 hover:bg-sand-100 hover:text-ink"
              >
                Gestionar reservas
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
