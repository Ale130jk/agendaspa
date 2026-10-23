import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { Field, Input, Textarea } from '../../components/Field';
import { Modal } from '../../components/Modal';
import { PageHeader, EmptyState } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { useServices } from '../../hooks/useCatalog';
import { api, toApiError } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import type { Service } from '../../types/api';

const schema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
  description: z.string().trim().max(1000),
  durationMinutes: z
    .number({ invalid_type_error: 'Ingresa una duración' })
    .int()
    .min(15, 'Mínimo 15 minutos')
    .max(480, 'Máximo 480 minutos'),
  priceSoles: z
    .number({ invalid_type_error: 'Ingresa un precio' })
    .min(0, 'El precio no puede ser negativo')
    .max(100_000, 'El precio es demasiado alto'),
  isActive: z.boolean(),
});

type ServiceFormValues = z.infer<typeof schema>;

const defaultValues: ServiceFormValues = {
  name: '',
  description: '',
  durationMinutes: 60,
  priceSoles: 0,
  isActive: true,
};

export function AdminServicesPage() {
  const queryClient = useQueryClient();
  const servicesQuery = useServices(true);
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: ServiceFormValues) => {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        durationMinutes: values.durationMinutes,
        priceCents: Math.round(values.priceSoles * 100),
      };

      if (editing && editing !== 'new') {
        await api.patch(`/services/${editing.id}`, {
          ...payload,
          description: values.description || null,
          isActive: values.isActive,
        });
      } else {
        await api.post('/services', payload);
      }
    },
    onSuccess: () => {
      setMessage(editing === 'new' ? 'Servicio creado.' : 'Servicio actualizado.');
      setError(null);
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ['services'] });
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (mutationError) => {
      setError(toApiError(mutationError).message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (service: Service) => {
      await api.patch(`/services/${service.id}`, { isActive: !service.isActive });
    },
    onSuccess: () => {
      setMessage('Estado del servicio actualizado.');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['services'] });
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
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

  const openEdit = (service: Service) => {
    reset({
      name: service.name,
      description: service.description ?? '',
      durationMinutes: service.durationMinutes,
      priceSoles: service.priceCents / 100,
      isActive: service.isActive,
    });
    setError(null);
    setEditing(service);
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    await saveMutation.mutateAsync(values).catch(() => undefined);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo"
        title="Servicios y precios."
        description="Edita lo que ven tus clientes. Los cambios afectan la disponibilidad de inmediato."
        actions={<Button onClick={openNew}>Nuevo servicio</Button>}
      />

      {message ? <Alert tone="success">{message}</Alert> : null}
      {error && !editing ? <Alert tone="error">{error}</Alert> : null}

      {servicesQuery.isLoading ? (
        <Spinner label="Cargando servicios" />
      ) : servicesQuery.isError ? (
        <Alert tone="error">No pudimos cargar los servicios.</Alert>
      ) : servicesQuery.data?.length ? (
        <div className="grid gap-4">
          {servicesQuery.data.map((service) => (
            <article
              key={service.id}
              className="rounded-3xl border border-sand-200 bg-white/75 p-5 shadow-soft"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-2xl text-ink">{service.name}</h2>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        service.isActive ? 'bg-sage-50 text-sage-800' : 'bg-sand-100 text-ink/50'
                      }`}
                    >
                      {service.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink/55">
                    {service.description ?? 'Sin descripción.'}
                  </p>
                  <p className="mt-3 text-sm text-ink/50">
                    {service.durationMinutes} min · {formatMoney(service.priceCents)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(service)}>
                    Editar
                  </Button>
                  <Button
                    variant={service.isActive ? 'ghost' : 'primary'}
                    size="sm"
                    loading={
                      toggleMutation.isPending && toggleMutation.variables?.id === service.id
                    }
                    onClick={() => toggleMutation.mutate(service)}
                  >
                    {service.isActive ? 'Desactivar' : 'Reactivar'}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Todavía no hay servicios"
          description="Crea el primer ritual para que aparezca en la página pública y en el flujo de reservas."
          action={<Button onClick={openNew}>Crear servicio</Button>}
        />
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Nuevo servicio' : 'Editar servicio'}
        description="Define nombre, duración y precio. El precio se muestra en soles."
        size="lg"
      >
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {error ? <Alert tone="error">{error}</Alert> : null}

          <Field label="Nombre" htmlFor="service-name" error={errors.name?.message}>
            <Input id="service-name" placeholder="Masaje relajante" {...register('name')} />
          </Field>

          <Field
            label="Descripción"
            htmlFor="service-description"
            error={errors.description?.message}
          >
            <Textarea
              id="service-description"
              placeholder="Describe la experiencia en una o dos frases."
              {...register('description')}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Duración (minutos)"
              htmlFor="service-duration"
              error={errors.durationMinutes?.message}
            >
              <Input
                id="service-duration"
                type="number"
                min={15}
                max={480}
                step={5}
                {...register('durationMinutes', { valueAsNumber: true })}
              />
            </Field>
            <Field label="Precio (PEN)" htmlFor="service-price" error={errors.priceSoles?.message}>
              <Input
                id="service-price"
                type="number"
                min={0}
                max={100000}
                step={0.5}
                {...register('priceSoles', { valueAsNumber: true })}
              />
            </Field>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-white/60 px-4 py-3 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-sage-700" {...register('isActive')} />
            <span>
              <span className="font-semibold text-ink">Servicio activo</span>
              <span className="block text-xs text-ink/50">
                Si lo desactivas, deja de mostrarse a los clientes.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-2 border-t border-sand-200 pt-5">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting || saveMutation.isPending}>
              Guardar servicio
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
