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

const schema = z
  .object({
    fullName: z.string().trim().min(2, 'Escribe tu nombre').max(120),
    email: z.string().trim().email('Ingresa un correo válido'),
    phone: z.string().trim().max(30, 'El teléfono es demasiado largo').optional().or(z.literal('')),
    password: z.string().min(8, 'Usa al menos 8 caracteres').max(128),
    confirmPassword: z.string().min(8, 'Confirma tu contraseña'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type RegisterValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { user, status, register: registerUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/reservar';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  if (status === 'authenticated' && user) {
    return <Navigate to={from || homeForRole(user.role)} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const created = await registerUser({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone || undefined,
        password: values.password,
      });
      navigate(from || homeForRole(created.role), { replace: true });
    } catch (error) {
      setError('root', { message: toApiError(error).message });
    }
  });

  return (
    <AuthShell
      eyebrow="Nueva cuenta"
      title="Abre un espacio para ti."
      description="Crea tu cuenta de cliente para reservar y gestionar tus citas."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-sage-800 hover:text-sage-900">
            Iniciar sesión
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        {errors.root?.message ? <Alert tone="error">{errors.root.message}</Alert> : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nombre completo" htmlFor="fullName" error={errors.fullName?.message}>
            <Input
              id="fullName"
              autoComplete="name"
              placeholder="Ana Flores"
              {...register('fullName')}
            />
          </Field>
          <Field label="Teléfono (opcional)" htmlFor="phone" error={errors.phone?.message}>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+51 999 999 999"
              {...register('phone')}
            />
          </Field>
        </div>

        <Field label="Correo" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            {...register('email')}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Contraseña" htmlFor="password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              {...register('password')}
            />
          </Field>
          <Field
            label="Confirmar contraseña"
            htmlFor="confirmPassword"
            error={errors.confirmPassword?.message}
          >
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repite la contraseña"
              {...register('confirmPassword')}
            />
          </Field>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Crear cuenta
        </Button>
      </form>
    </AuthShell>
  );
}
