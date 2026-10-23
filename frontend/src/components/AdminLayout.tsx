import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../lib/cn';

const tabs = [
  { to: '/admin', label: 'Resumen', end: true },
  { to: '/admin/servicios', label: 'Servicios' },
  { to: '/admin/staff', label: 'Staff' },
  { to: '/admin/reservas', label: 'Reservas' },
];

export function AdminLayout() {
  return (
    <div className="container-page py-8 sm:py-10">
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-700">
            Administración
          </p>
          <h1 className="mt-1 font-display text-3xl text-ink">El pulso del spa</h1>
        </div>

        <nav
          aria-label="Secciones de administración"
          className="flex gap-1 overflow-x-auto rounded-full border border-sand-200 bg-white/60 p-1"
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500',
                  isActive
                    ? 'bg-sage-700 text-white'
                    : 'text-ink/60 hover:bg-sand-100 hover:text-ink',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </div>
  );
}
