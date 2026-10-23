import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { buttonStyles } from '../../lib/buttonStyles';
import { Field, Input, Textarea } from '../../components/Field';
import { Modal } from '../../components/Modal';
import { EmptyState, PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { useServices, useStaffList } from '../../hooks/useCatalog';
import { api, toApiError } from '../../lib/api';
import type { StaffMember } from '../../types/api';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Escribe el nombre completo').max(120),
  email: z.string().trim().email('Ingresa un correo válido'),
  password: z.string().max(128).optional(),
  phone: z.string().trim().max(30),
  bio: z.string().trim().max(1000),
  serviceIds: z.array(z.string()),
  isActive: z.boolean(),
});

type StaffFormValues = z.infer<typeof schema>;

const defaultValues: StaffFormValues = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  bio: '',
  serviceIds: [],
  isActive: true,
};

export function AdminStaffPage() {
  const queryClient = useQueryClient();
  const staffQuery = useStaffList({ includeInactive: true });
  const servicesQuery = useServices(true);
  const [editing, setEditing] = useState<StaffMember | 'new' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: StaffFormValues) => {
      const base = {
        fullName: values.fullName,
        phone: values.phone.trim() || undefined,
        bio: values.bio.trim() || undefined,
        serviceIds: values.serviceIds,
      };

      if (editing && editing !== 'new') {
        await api.patch(`/staff/${editing.id}`, {
          ...base,
          phone: values.phone.trim() || null,
          bio: values.bio.trim() || null,
          isActive: values.isActive,
          ...(values.password ? { password: values.password } : {}),
        });
      } else {
        await api.post('/staff', {
          ...base,
          email: values.email,
          password: values.password,
        });
      }
    },
    onSuccess: () => {
      setMessage(editing === 'new' ? 'Integrante creado.' : 'Integrante actualizado.');
      setError(null);
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ['staff'] });
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (mutationError) => {
      setError(toApiError(mutationError).message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (member: StaffMember) => {
      await api.patch(`/staff/${member.id}`, { isActive: !member.isActive });
    },
    onSuccess: () => {
      setMessage('Estado del integrante actualizado.');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (mutationError) => {
      setError(toApiError(mutationError).message);
    },
  });

  const openNew = () => {
    reset(defaultValues);
    setError(null);
    setEditing('new');
  };

  const openEdit = (member: StaffMember) => {
    reset({
      fullName: member.fullName,
      email: member.email ?? '',
      password: '',
      phone: member.phone ?? '',
      bio: member.bio ?? '',
      serviceIds: member.services.map((service) => service.id),
      isActive: member.isActive,
    });
    setError(null);
    setEditing(member);
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    if (editing === 'new' && (!values.password || values.password.length < 8)) {
      setFormError('password', { message: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }
    if (values.password && values.password.length < 8) {
      setFormError('password', { message: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }
    await saveMutation.mutateAsync(values).catch(() => undefined);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Equipo"
        title="Quién acompaña."
        description="Gestiona integrantes, servicios asignados, horarios y ausencias."
        actions={<Button onClick={openNew}>Nuevo integrante</Button>}
      />

      {message ? <Alert tone="success">{message}</Alert> : null}
      {error && !editing ? <Alert tone="error">{error}</Alert> : null}

      {staffQuery.isLoading ? (
        <Spinner label="Cargando equipo" />
      ) : staffQuery.isError ? (
        <Alert tone="error">No pudimos cargar al equipo.</Alert>
      ) : staffQuery.data?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {staffQuery.data.map((member) => (
            <article
              key={member.id}
              className="flex h-full flex-col rounded-3xl border border-sand-200 bg-white/75 p-5 shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl text-ink">{member.fullName}</h2>
                  <p className="mt-1 text-sm text-ink/50">{member.email}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    member.isActive ? 'bg-sage-50 text-sage-800' : 'bg-sand-100 text-ink/50'
                  }`}
                >
                  {member.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/60">
                {member.bio ?? 'Sin biografía todavía.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {member.services.length ? (
                  member.services.map((service) => (
                    <span
                      key={service.id}
                      className="rounded-full bg-sand-100 px-2.5 py-1 text-xs text-ink/60"
                    >
                      {service.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-ink/40">Sin servicios asignados</span>
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-sand-200 pt-4">
                <Link to={`/admin/staff/${member.id}`} className={buttonStyles('secondary', 'sm')}>
                  Horario y ausencias
                </Link>
                <Button variant="ghost" size="sm" onClick={() => openEdit(member)}>
                  Editar
                </Button>
                <Button
                  variant={member.isActive ? 'ghost' : 'primary'}
                  size="sm"
                  loading={toggleMutation.isPending && toggleMutation.variables?.id === member.id}
                  onClick={() => toggleMutation.mutate(member)}
                >
                  {member.isActive ? 'Desactivar' : 'Reactivar'}
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="El equipo está vacío"
          description="Crea el primer integrante para asignarle servicios y horarios."
          action={<Button onClick={openNew}>Crear integrante</Button>}
        />
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Nuevo integrante' : 'Editar integrante'}
        description="El correo no se puede cambiar después de crear la cuenta."
        size="lg"
      >
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {error ? <Alert tone="error">{error}</Alert> : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nombre completo" htmlFor="staff-name" error={errors.fullName?.message}>
              <Input id="staff-name" {...register('fullName')} />
            </Field>
            <Field label="Correo" htmlFor="staff-email" error={errors.email?.message}>
              <Input
                id="staff-email"
                type="email"
                readOnly={Boolean(editing && editing !== 'new')}
                className={editing && editing !== 'new' ? 'bg-sand-50 text-ink/50' : undefined}
                {...register('email')}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={editing === 'new' ? 'Contraseña' : 'Nueva contraseña (opcional)'}
              htmlFor="staff-password"
              error={errors.password?.message}
            >
              <Input
                id="staff-password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                {...register('password')}
              />
            </Field>
            <Field label="Teléfono" htmlFor="staff-phone" error={errors.phone?.message}>
              <Input id="staff-phone" type="tel" {...register('phone')} />
            </Field>
          </div>

          <Field label="Biografía" htmlFor="staff-bio" error={errors.bio?.message}>
            <Textarea
              id="staff-bio"
              placeholder="Especialidad, enfoque y estilo de atención."
              {...register('bio')}
            />
          </Field>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">Servicios asignados</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {servicesQuery.data?.map((service) => (
                <label
                  key={service.id}
                  className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-white/60 px-3 py-2.5 text-sm"
                >
                  <input
                    type="checkbox"
                    value={service.id}
                    className="h-4 w-4 accent-sage-700"
                    {...register('serviceIds')}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{service.name}</span>
                    {!service.isActive ? (
                      <span className="text-xs text-ink/40">Inactivo</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-white/60 px-4 py-3 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-sage-700" {...register('isActive')} />
            <span>
              <span className="font-semibold text-ink">Integrante activo</span>
              <span className="block text-xs text-ink/50">
                Si lo desactivas, no aparecerá para nuevas reservas.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-2 border-t border-sand-200 pt-5">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting || saveMutation.isPending}>
              Guardar integrante
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
