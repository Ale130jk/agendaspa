import { Link } from 'react-router-dom';
import { buttonStyles } from '../lib/buttonStyles';

export function NotFoundPage() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="font-display text-7xl text-sage-200">404</p>
      <h1 className="mt-4 font-display text-3xl text-ink sm:text-4xl">
        Esta página no está en la agenda.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink/60">
        Puede que el enlace haya cambiado o que la página ya no exista. Vuelve al inicio o reserva
        un ritual desde aquí.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/" className={buttonStyles('primary', 'md')}>
          Volver al inicio
        </Link>
        <Link to="/reservar" className={buttonStyles('secondary', 'md')}>
          Reservar un ritual
        </Link>
      </div>
    </div>
  );
}
