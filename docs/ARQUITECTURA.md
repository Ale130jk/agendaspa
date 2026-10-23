# Arquitectura de AgendaSpa

## 1. Contexto y alcance

AgendaSpa es una aplicación web para reservar servicios de spa. El alcance funcional es deliberadamente acotado:

- Los clientes se registran, consultan disponibilidad y reservan.
- Una reserva nace pendiente, bloquea el horario durante 5 minutos y se confirma dentro de ese plazo.
- Los clientes pueden cancelar hasta 24 horas antes del inicio.
- No hay pagos, reprogramación ni reservas anónimas.
- El staff consulta su agenda y sus reservas, pero no modifica estados.
- El administrador gestiona servicios, especialistas, horarios, ausencias y reservas.

La aplicación se despliega como una SPA servida por Nginx y una API REST en Express. PostgreSQL es la fuente de verdad; Redis es una caché opcional.

## 2. Vista de componentes

```text
┌──────────────────────────────┐
│ Navegador                    │
│ React 18 + React Router 7    │
└──────────────┬───────────────┘
               │ HTTPS / HTTP local
┌──────────────▼───────────────┐
│ Nginx :80                    │
│ - SPA estática               │
│ - Proxy /api, /docs, /health │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐        ┌──────────────────┐
│ Express :3000                │───────▶│ PostgreSQL 16    │
│ - REST API                   │        │ datos + GiST     │
│ - JWT + cookies              │        └──────────────────┘
│ - Job de expiración          │        ┌──────────────────┐
│ - OpenAPI                    │───────▶│ Redis 7          │
└──────────────────────────────┘        │ caché disponible │
                                        └──────────────────┘
```

En Docker Compose, Nginx espera a que el backend esté saludable. El backend espera a PostgreSQL y Redis. Los healthchecks usan `/health` y `/ready`.

## 3. Módulos del backend

| Módulo         | Responsabilidad                                                       |
| -------------- | --------------------------------------------------------------------- |
| `auth`         | Registro, login, refresh rotativo, logout y perfil actual.            |
| `users`        | Proyección pública de usuarios y selección de campos.                 |
| `services`     | Catálogo público y CRUD administrativo con borrado lógico.            |
| `staff`        | Especialistas, asignación de servicios, horarios y ausencias.         |
| `availability` | Cálculo puro de slots, consultas y caché versionada.                  |
| `bookings`     | Creación, confirmación, cancelación, finalización, listados y agenda. |
| `docs`         | Objeto OpenAPI tipado y generador de `docs/openapi.json`.             |

Cada módulo separa rutas, controladores, schemas Zod, servicio y repositorio cuando aporta valor. Las rutas no contienen reglas de negocio; los servicios no construyen respuestas HTTP.

### Flujo de una petición

```text
request
  → helmet / cors / request id / pino
  → rate limit
  → autenticación opcional o requerida
  → validación Zod (params, query, body, headers)
  → controlador
  → servicio de dominio
  → repositorio / Prisma
  → presentador
  → respuesta JSON
  → error handler tipado si algo falla
```

Los errores de validación se normalizan a `422`. Los conflictos de estado o de slot usan `409`. Las respuestas de error siempre incluyen `requestId`.

## 4. Modelo de datos

```text
User 1───0..1 StaffProfile 1───* WorkingHours
  │              │ 1───* TimeOff
  │              │ 1───* StaffService *───1 Service
  │              │ 1───* Booking
  │ 1───* RefreshToken
  └ 1───* Booking (como cliente)
```

| Tabla          | Campos relevantes                                                                   |
| -------------- | ----------------------------------------------------------------------------------- |
| `User`         | `email` único, `passwordHash`, `role`, `isActive`, `phone`.                         |
| `StaffProfile` | Perfil separado del usuario; `bio`, `isActive`.                                     |
| `Service`      | `durationMinutes`, `priceCents`, `isActive`.                                        |
| `StaffService` | PK compuesta `(staffId, serviceId)`.                                                |
| `WorkingHours` | `weekday` ISO 1–7, `startMinute` y `endMinute` locales.                             |
| `TimeOff`      | Rango `timestamptz` con motivo opcional.                                            |
| `Booking`      | Cliente, staff, servicio, estado, rango, `expiresAt`, clave y hash de idempotencia. |
| `RefreshToken` | Hash SHA-256, `familyId`, `expiresAt`, `revokedAt`, `replacedByTokenId`.            |

Los timestamps de dominio son `timestamptz` y se guardan en UTC. Los horarios de trabajo usan minutos locales porque representan una regla semanal, no un instante.

### Restricciones críticas

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist (
    "staffId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  ) WHERE ("status" IN ('PENDING', 'CONFIRMED'));
```

Esta restricción impide que dos reservas activas del mismo especialista se solapen, incluso si dos procesos comprueban la disponibilidad al mismo tiempo. La consulta previa existe para dar un error legible; la base de datos es la última defensa.

También hay checks para `endAt > startAt`, duración y precio positivos, rangos de horarios y ausencias válidas.

## 5. Ciclo de vida de una reserva

```text
                 confirmar
   PENDING ─────────────────▶ CONFIRMED ─── completar ──▶ COMPLETED
      │                           │
      │ vencer / cancelar         │ cancelar
      ▼                           ▼
   CANCELLED ◀───────────────────┘
```

Reglas:

1. Crear exige un cliente autenticado y `Idempotency-Key`.
2. La reserva se crea en `PENDING` y bloquea el horario.
3. `expiresAt` se calcula con `PENDING_BOOKING_TTL_SECONDS` (300 segundos por defecto).
4. El cliente o un administrador puede confirmar antes de que empiece y antes de que venza.
5. Si vence, el job la pasa a `CANCELLED` y libera la disponibilidad.
6. Un cliente puede cancelar una reserva `PENDING` o `CONFIRMED` solo si faltan al menos 24 horas. Un administrador no tiene esa restricción.
7. Un administrador puede completar una reserva `CONFIRMED` cuyo inicio ya pasó.
8. El staff no confirma, cancela ni completa.

### Creación con concurrencia

```text
POST /api/bookings
  Idempotency-Key: <uuid>
  body: { serviceId, staffId, startAt }
        │
        ▼
buscar (clientId, idempotencyKey)
  ├─ existe y mismo hash  → devolver reserva existente (200)
  ├─ existe y otro hash   → 422 IDEMPOTENCY_KEY_REUSED
  └─ no existe
        │
        ▼
validar servicio, staff, fecha, alineación y disponibilidad
  ├─ no disponible → buscar de nuevo la clave → 200 si es un reintento, si no 409
  └─ disponible
        │
        ▼
BEGIN
  comprobar solapamiento
  INSERT Booking PENDING
COMMIT
        │
        ├─ éxito → 201
        └─ violación 23P01 / P2002
             ├─ buscar de nuevo la clave → devolver original si existe
             └─ si no → 409 SLOT_TAKEN
```

La búsqueda de idempotencia se repite también cuando la validación de disponibilidad o la comprobación de solapamiento detectan un conflicto. Esa segunda lectura cierra la carrera en la que el primer request todavía no había confirmado cuando el reintento empezó. La prueba de 25 peticiones concurrentes con claves distintas espera exactamente un `201` y veinticuatro `409`. La prueba de reintentos con la misma clave espera un `201`, respuestas `200` con el mismo identificador y ninguna reserva duplicada.

## 6. Disponibilidad

El cálculo es una función pura en `availability.calculator.ts`:

1. Convierte la fecha local de `SPA_TIMEZONE` al inicio del día.
2. Obtiene el día ISO (1 = lunes, 7 = domingo).
3. Filtra los intervalos de trabajo del especialista para ese día.
4. Avanza en pasos de `SLOT_INTERVAL_MINUTES` (15 minutos).
5. Descarta slots que no caben completos en el intervalo.
6. Descarta slots en el pasado, fuera del horizonte o que se cruzan con ausencias o reservas activas.
7. Devuelve los slots ordenados por instante de inicio.

El buffer es 0. El horizonte es 60 días. La duración del servicio determina el final del slot. Un slot que empieza en el pasado no se ofrece, aunque termine en el futuro.

### Caché

- Clave: `availability:v{version}:{staffId}:{serviceId}:{date}`.
- Versión: `availability:version:{staffId}`.
- TTL: 30 segundos.
- Invalidación: se incrementa la versión del especialista al crear, confirmar, cancelar, completar o expirar una reserva.
- Tolerancia a fallos: cualquier error o timeout de Redis se trata como _cache miss_. La API sigue respondiendo desde PostgreSQL.

La versión evita tener que enumerar claves para invalidar. Una clave vieja puede permanecer hasta su TTL, pero deja de consultarse.

## 7. Autenticación y autorización

### Sesión

- Registro y login devuelven un access token JWT y establecen una cookie de refresh.
- El access token incluye `sub`, `role`, `type: "access"`, issuer y audience; dura 15 minutos.
- El refresh token es opaco, aleatorio, se guarda hasheado con SHA-256 y pertenece a una familia.
- Cada refresh rota el token. El anterior se marca como usado y se enlaza con el nuevo.
- Si se reutiliza un token ya rotado, se revoca toda la familia.
- La cookie es `httpOnly`, `SameSite=Lax`, `path=/api/auth`; `Secure` se activa con `COOKIE_SECURE=true`.

La autorización de rutas se hace con `authenticate` y `requireRole`. La autorización de recurso se hace en el servicio, por ejemplo para que un cliente solo vea sus propias reservas o un staff solo su agenda.

### Matriz de permisos

| Acción                                | Cliente        | Staff              | Admin     |
| ------------------------------------- | -------------- | ------------------ | --------- |
| Ver servicios y especialistas activos | Sí             | Sí                 | Sí        |
| Ver disponibilidad                    | Sí             | Sí                 | Sí        |
| Crear reserva                         | Sí             | No                 | No        |
| Ver sus reservas                      | Sí             | No                 | No        |
| Ver reservas propias del staff        | No             | Sí                 | Sí        |
| Ver cualquier reserva                 | Solo las suyas | Solo las asignadas | Sí        |
| Confirmar reserva                     | Sí, la propia  | No                 | Sí        |
| Cancelar reserva                      | Sí, con 24 h   | No                 | Sí        |
| Completar reserva                     | No             | No                 | Sí        |
| Gestionar servicios                   | No             | No                 | Sí        |
| Gestionar staff, horarios y ausencias | No             | No                 | Sí        |
| Ver agenda                            | No             | Sí, la propia      | Sí, todas |

## 8. Contrato HTTP y observabilidad

Las respuestas exitosas usan `{ data, ... }` o un recurso con nombre (`service`, `staff`, `booking`, `availability`). Los errores usan:

```json
{
  "error": {
    "code": "SLOT_TAKEN",
    "message": "The selected slot is no longer available",
    "requestId": "req-123"
  }
}
```

`details` se agrega en errores de validación. El mensaje de error interno se oculta en producción.

La API emite logs JSON con pino y asigna un request id a cada petición. `/health` es liveness y `/ready` comprueba PostgreSQL y Redis. OpenAPI se sirve en `/docs` y `/openapi.json`.

## 9. Dinero y zona horaria

- `priceCents` es un entero en centavos. El frontend formatea `PEN` con `Intl.NumberFormat`.
- `SPA_TIMEZONE` es configurable y por defecto es `America/Lima`.
- La base guarda instantes UTC. La lógica de negocio convierte a la zona del spa para interpretar horarios, días de la semana y ventanas de cancelación.
- El cálculo de fecha usa `date-fns-tz`, no la zona del navegador.

## 10. Despliegue

```text
docker compose
  ├─ db: postgres:16-alpine + volumen
  ├─ redis: redis:7-alpine + AOF + volumen
  ├─ backend: Node 22, migraciones, seed y API
  └─ frontend: build de Vite + Nginx
```

El backend aplica `prisma migrate deploy` al arrancar. No usa `prisma migrate dev` porque la restricción GiST es SQL manual que Prisma no modela.

CI ejecuta lint, typecheck, pruebas, build, verificación de OpenAPI y pruebas de integración contra PostgreSQL 16 y Redis 7. El workflow de publicación construye imágenes para GHCR; no hay despliegue público automático.

## 11. Decisiones y límites

- **Job de expiración en el proceso:** se ejecuta cada minuto con `setInterval` y usa actualizaciones condicionales. Es suficiente para una instancia. Con varias réplicas conviene moverlo a un worker o usar un lock distribuido.
- **Sin colas:** el volumen del portafolio no justifica un broker. Redis se usa solo como caché.
- **Sin reprogramación:** cancelar y volver a reservar mantiene el modelo simple y evita estados ambiguos.
- **Sin pagos:** el precio se muestra, pero no se cobra.
- **Staff de solo lectura:** reduce la superficie de autorización y refleja el flujo operativo definido.
- **Caché fail-open:** prioriza disponibilidad sobre consistencia estricta durante 30 segundos; la restricción de base de datos sigue protegiendo la creación.
- **Integración verificada en Docker:** la suite de 20 pruebas se ejecutó contra PostgreSQL 16 y Redis 7 dentro de Compose; también se verificaron el build de imágenes, las migraciones, el seed, el proxy y una prueba de carga con k6.

## Glosario

| Término                | Significado                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------- |
| Slot                   | Intervalo reservable que empieza en un múltiplo de 15 minutos.                        |
| Disponibilidad         | Lista de slots libres para un servicio, especialista y fecha.                         |
| Reserva pendiente      | Reserva `PENDING` que bloquea el horario hasta `expiresAt`.                           |
| Ventana de cancelación | 24 horas antes del inicio; solo aplica a clientes.                                    |
| Especialista / staff   | Usuario con `StaffProfile` y servicios asignados.                                     |
| Agenda                 | Vista de reservas por rango de fechas para staff o admin.                             |
| Familia de refresh     | Conjunto de tokens rotados desde un mismo login.                                      |
| Seam                   | Frontera pública usada para probar comportamiento sin inspeccionar detalles internos. |
