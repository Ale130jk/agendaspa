import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Alert } from '../components/Alert';
import { AuthShell } from '../components/AuthShell';
import { Button } from '../components/Button';
import { Field, Input } from '../components/Field';
import { useAuth } from '../lib/auth-context';
import { homeForRole } from '../lib/roles';
import { toApiError } from '../lib/api';

const schema = z.object({
  email: z.string().trim().email('Ingresa un correo válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type LoginValues = z.infer<typeof schema>;

export function LoginPage() {
  const { user, status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  if (status === 'authenticated' && user) {
    return <Navigate to={from ?? homeForRole(user.role)} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const loggedUser = await login(values.email, values.password);
      navigate(from ?? homeForRole(loggedUser.role), { replace: true });
    } catch (error) {
      setError('root', { message: toApiError(error).message });
    }
  });

  return (
    <AuthShell
      eyebrow="Tu cuenta"
      title="Volver a tu ritmo."
      description="Entra para reservar, revisar tus próximas citas o gestionar el spa."
      footer={
        <>
          ¿Aún no tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-sage-800 hover:text-sage-900">
            Crear una cuenta
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        {errors.root?.message ? <Alert tone="error">{errors.root.message}</Alert> : null}

        <Field label="Correo" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            {...register('email')}
          />
        </Field>

        <Field label="Contraseña" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
            {...register('password')}
          />
        </Field>

        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Entrar
        </Button>
      </form>
    </AuthShell>
  );
}
