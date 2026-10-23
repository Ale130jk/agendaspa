import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [pathname]);

  return null;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, status, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF';

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-sage-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Ir al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-sand-200/80 bg-paper/90 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-baseline gap-2" aria-label="AgendaSpa, inicio">
            <span className="font-display text-xl tracking-tight text-ink">AgendaSpa</span>
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.24em] text-sage-700 sm:inline">
              Lima
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
            {!user ? (
              <>
                <a href="/#rituales" className="nav-link">
                  Rituales
                </a>
                <a href="/#equipo" className="nav-link">
                  Equipo
                </a>
                <a href="/#como-funciona" className="nav-link">
                  Cómo funciona
                </a>
                <Link to="/login" className="nav-link">
                  Iniciar sesión
                </Link>
                <Link
                  to="/registro"
                  className="ml-2 rounded-full bg-sage-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sage-800"
                >
                  Crear cuenta
                </Link>
              </>
            ) : null}

            {user?.role === 'CLIENT' ? (
              <>
                <a href="/#rituales" className="nav-link">
                  Rituales
                </a>
                <Link to="/mis-reservas" className="nav-link">
                  Mis reservas
                </Link>
                <Link
                  to="/reservar"
                  className="ml-2 rounded-full bg-sage-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sage-800"
                >
                  Reservar
                </Link>
              </>
            ) : null}

            {isStaff ? (
              <Link to="/agenda" className="nav-link">
                Mi agenda
              </Link>
            ) : null}

            {isAdmin ? (
              <>
                <Link to="/admin" className="nav-link">
                  Panel
                </Link>
                <Link to="/agenda" className="nav-link">
                  Agenda
                </Link>
              </>
            ) : null}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {status === 'authenticated' && user ? (
              <>
                <span className="max-w-36 truncate text-sm text-ink/60">
                  Hola, {user.fullName.split(' ')[0]}
                </span>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-full px-3 py-2 text-sm font-semibold text-ink/60 transition hover:bg-sand-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
                >
                  Salir
                </button>
              </>
            ) : null}
          </div>

          <button
            type="button"
            className="rounded-full p-2 text-ink transition hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
              {menuOpen ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>

        {menuOpen ? (
          <div
            id="mobile-menu"
            className="border-t border-sand-200 bg-paper px-5 py-4 md:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <nav className="flex flex-col gap-1" aria-label="Navegación móvil">
              {!user ? (
                <>
                  <a href="/#rituales" className="mobile-nav-link">
                    Rituales
                  </a>
                  <a href="/#equipo" className="mobile-nav-link">
                    Equipo
                  </a>
                  <a href="/#como-funciona" className="mobile-nav-link">
                    Cómo funciona
                  </a>
                  <Link to="/login" className="mobile-nav-link">
                    Iniciar sesión
                  </Link>
                  <Link
                    to="/registro"
                    className="mt-2 rounded-full bg-sage-700 px-4 py-3 text-center text-sm font-semibold text-white"
                  >
                    Crear cuenta
                  </Link>
                </>
              ) : null}

              {user?.role === 'CLIENT' ? (
                <>
                  <a href="/#rituales" className="mobile-nav-link">
                    Rituales
                  </a>
                  <Link to="/mis-reservas" className="mobile-nav-link">
                    Mis reservas
                  </Link>
                  <Link
                    to="/reservar"
                    className="mt-2 rounded-full bg-sage-700 px-4 py-3 text-center text-sm font-semibold text-white"
                  >
                    Reservar
                  </Link>
                </>
              ) : null}

              {isStaff ? (
                <Link to="/agenda" className="mobile-nav-link">
                  Mi agenda
                </Link>
              ) : null}

              {isAdmin ? (
                <>
                  <Link to="/admin" className="mobile-nav-link">
                    Panel
                  </Link>
                  <Link to="/agenda" className="mobile-nav-link">
                    Agenda
                  </Link>
                </>
              ) : null}

              {user ? (
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="mt-2 rounded-full border border-sand-300 px-4 py-3 text-sm font-semibold text-ink/70"
                >
                  Cerrar sesión
                </button>
              ) : null}
            </nav>
          </div>
        ) : null}
      </header>

      <main id="contenido" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-sand-200 bg-sand-100/70">
        <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="font-display text-xl text-ink">AgendaSpa</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/60">
              Reservas claras, tiempos reales y una pausa que sí cabe en tu semana.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sage-700">Horario</p>
            <p className="mt-2 text-sm text-ink/65">Lunes a sábado · 9:00 a 18:00</p>
            <p className="text-sm text-ink/65">Lima, Perú</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sage-700">Tu cuenta</p>
            <div className="mt-2 flex flex-col gap-1 text-sm text-ink/65">
              <Link to="/mis-reservas" className="hover:text-ink">
                Mis reservas
              </Link>
              <Link to="/reservar" className="hover:text-ink">
                Reservar un ritual
              </Link>
              <Link to="/login" className="hover:text-ink">
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
        <div className="container-page border-t border-sand-200 py-4 text-xs text-ink/45">
          © {new Date().getFullYear()} AgendaSpa. Demo de portafolio.
        </div>
      </footer>
    </div>
  );
}
