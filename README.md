# AgendaSpa

AgendaSpa es una aplicación full stack de reservas para un spa. Incluye autenticación con roles, catálogo de servicios, disponibilidad por especialista, reservas con expiración, agenda interna y un panel de administración.

El proyecto está pensado como pieza de portafolio: prioriza integridad de datos, separación de responsabilidades, pruebas y despliegue reproducible con Docker Compose.

## Stack

| Capa            | Tecnología                                                                    |
| --------------- | ----------------------------------------------------------------------------- |
| Frontend        | React 18, TypeScript, Vite, React Router 7, TanStack Query, Tailwind CSS      |
| Backend         | Node.js 22, Express 4, TypeScript, Prisma 6, Zod                              |
| Base de datos   | PostgreSQL 16 con `btree_gist` y restricción de exclusión                     |
| Caché           | Redis 7 para disponibilidad                                                   |
| Autenticación   | Argon2id, access JWT de 15 minutos, refresh token rotativo en cookie httpOnly |
| Infraestructura | Docker Compose, Nginx, GitHub Actions, GHCR                                   |
| Pruebas         | Vitest, Supertest, Testing Library, k6                                        |

## Demo

El seed crea datos de demostración cuando `SEED_DEMO=true`.

| Rol           | Correo                    | Contraseña   |
| ------------- | ------------------------- | ------------ |
| Administrador | `admin@agendaspa.local`   | `Admin123!`  |
| Staff         | `lucia@agendaspa.local`   | `Staff123!`  |
| Staff         | `mateo@agendaspa.local`   | `Staff123!`  |
| Cliente       | `cliente@agendaspa.local` | `Client123!` |

Los horarios demo son de lunes a sábado, de 09:00 a 13:00 y de 14:00 a 18:00, en `America/Lima`. Los precios se muestran en soles peruanos (PEN).

## Arranque rápido con Docker Compose

Requisitos: Docker Desktop con el engine iniciado.

```powershell
Copy-Item .env.example .env
docker compose up --build
```

En macOS o Linux:

```bash
cp .env.example .env
docker compose up --build
```

Abre `http://localhost:8080`.

La primera ejecución aplica las migraciones y ejecuta el seed. El seed es idempotente: actualiza usuarios, servicios, asignaciones y horarios demo, pero no borra reservas existentes.

Servicios expuestos:

| Servicio     | URL                                  |
| ------------ | ------------------------------------ |
| Aplicación   | `http://localhost:8080`              |
| API directa  | `http://localhost:3000`              |
| Swagger UI   | `http://localhost:8080/docs`         |
| OpenAPI JSON | `http://localhost:8080/openapi.json` |
| PostgreSQL   | `localhost:5432`                     |
| Redis        | `localhost:6379`                     |

Si el puerto `5432` o `6379` ya está ocupado por otra instalación local, define `POSTGRES_PORT` o `REDIS_PORT` en `.env` antes de arrancar. El backend dentro de Compose siempre usa `db:5432` y `redis:6379`.

Para detener el stack:

```powershell
docker compose down
```

`docker compose down -v` elimina también los volúmenes de PostgreSQL y Redis. Es una operación destructiva: úsala solo si quieres reiniciar los datos.

## Desarrollo local

El backend carga `backend/.env` cuando se ejecuta como workspace. El archivo `.env` de la raíz es para la interpolación de Docker Compose, no para el backend local.

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
npm ci
npm run db:generate
docker compose up -d db redis
npm run db:migrate:deploy
npm run db:seed
```

En dos terminales:

```powershell
npm run dev -w backend
npm run dev -w frontend
```

El frontend queda en `http://localhost:5173` y Vite proxifica `/api` hacia `http://localhost:3000`.

Si usas PostgreSQL y Redis instalados localmente, ajusta `DATABASE_URL` y `REDIS_URL` en `backend/.env`.

### Migraciones

No uses `npm run db:migrate` en este repositorio. La integridad de reservas depende de una restricción `EXCLUDE USING gist` que Prisma no representa en el schema; `prisma migrate dev` puede intentar corregir esa diferencia.

Aplica migraciones existentes con:

```powershell
npm run db:migrate:deploy
```

Las migraciones nuevas se escriben como SQL manual dentro de `backend/prisma/migrations/` y se aplican con el mismo comando.

## Pruebas

```powershell
npm run db:generate
npm run typecheck
npm run lint
npm run test:unit -w backend
npm run test -w frontend
npm run build
```

Estado actual:

- 11 pruebas unitarias de backend.
- 8 pruebas de frontend.
- 20 pruebas de integración, ejecutadas contra PostgreSQL 16 y Redis 7 en Docker Compose.

Las pruebas de integración necesitan PostgreSQL y Redis. Crean y truncan una base cuyo nombre contenga `test`; el helper se niega a truncar cualquier otra base. La forma reproducible es ejecutarlas dentro del contenedor del backend, usando la red de Compose:

```powershell
docker compose exec -T db createdb -U agendaspa agendaspa_test
docker compose exec -T backend sh -lc 'DATABASE_URL="postgresql://agendaspa:agendaspa_dev_password@db:5432/agendaspa_test?schema=public" npm run db:migrate:deploy -w backend'
docker compose exec -T backend sh -lc 'TEST_DATABASE_URL="postgresql://agendaspa:agendaspa_dev_password@db:5432/agendaspa_test?schema=public" TEST_REDIS_URL="redis://redis:6379/1" npm run test:integration -w backend'
```

`createdb` falla si la base ya existe; puedes ignorar ese error. Si usas credenciales distintas, define también `TEST_DATABASE_URL` y `TEST_REDIS_URL`. Las pruebas usan `TEST_DATABASE_URL` o, por defecto, `agendaspa_test` en `localhost:5432`.

La suite se ejecutó completa contra el stack de Compose: 20/20 pruebas. Incluye 25 peticiones concurrentes al mismo horario con claves distintas, reintentos concurrentes con una sola clave, expiración, refresh rotativo y la restricción GiST. El detalle está en [`docs/REVISION.md`](docs/REVISION.md).

## API y documentación

La especificación se genera desde un objeto TypeScript versionado:

```powershell
npm run docs:openapi
```

El resultado se escribe en `docs/openapi.json` y se sirve en `/docs` y `/openapi.json`. La integración continua verifica que el archivo generado esté actualizado.

Documentos del proyecto:

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md): decisiones, modelo de datos, reservas y caché.
- [`docs/LIBRERIAS.md`](docs/LIBRERIAS.md): dependencias y criterios de selección.
- [`docs/REVISION.md`](docs/REVISION.md): evidencia de verificación, riesgos y pendientes.
- [`docs/openapi.json`](docs/openapi.json): contrato OpenAPI 3.0.3.

## Prueba de carga

`loadtest/availability.js` mide lecturas de catálogo y disponibilidad con k6. Requiere el stack levantado y el seed aplicado.

```powershell
$env:BASE_URL = "http://localhost:8080"
k6 run .\loadtest\availability.js
```

El límite global por defecto es `300` peticiones cada `15` minutos. Para medir rendimiento puro conviene elevarlo solo durante la prueba y reiniciar el backend después:

```powershell
$env:RATE_LIMIT_MAX = "100000"
docker compose up -d --no-build backend
k6 run .\loadtest\availability.js

Remove-Item Env:RATE_LIMIT_MAX
docker compose up -d --no-build backend
```

Resultado de la última ejecución con 10 VUs: 759 peticiones HTTP en 45 s, 0 % de errores, p95 de 8.17 ms y 100 % de checks. El detalle está en [`docs/REVISION.md`](docs/REVISION.md).

Variables opcionales:

| Variable      | Valor por defecto         | Uso                           |
| ------------- | ------------------------- | ----------------------------- |
| `K6_MAX_VUS`  | `10`                      | Usuarios virtuales máximos    |
| `K6_EMAIL`    | `cliente@agendaspa.local` | Usuario para obtener el token |
| `K6_PASSWORD` | `Client123!`              | Contraseña del usuario        |

El script falla si el login, el catálogo o la disponibilidad no responden con `200`. Los umbrales son error rate menor al 1 % y p95 menor a 500 ms.

## Estructura

```text
agendaspa/
├─ backend/
│  ├─ prisma/              # schema, migraciones SQL y seed
│  ├─ src/
│  │  ├─ config/           # entorno, logger, clientes
│  │  ├─ docs/             # OpenAPI y generador
│  │  ├─ errors/           # errores tipados y mapeo HTTP
│  │  ├─ lib/              # JWT, cookies, password, Redis
│  │  ├─ middleware/       # auth, validación, rate limit, errores
│  │  └─ modules/          # auth, services, staff, availability, bookings
│  └─ tests/               # unitarias e integración
├─ frontend/
│  ├─ src/
│  │  ├─ components/       # layout, guards, UI compartida
│  │  ├─ hooks/            # consultas y mutaciones
│  │  ├─ lib/              # API, auth, formato, estilos
│  │  └─ pages/            # públicas, cliente, staff y admin
│  └─ tests/
├─ docs/
├─ loadtest/
├─ docker-compose.yml
└─ .github/workflows/
```

## Decisiones principales

- **Integridad antes que “comprobar y esperar”.** La base de datos impide solapamientos con una restricción de exclusión. La aplicación no confía solo en una consulta previa.
- **Idempotencia explícita.** Crear una reserva exige `Idempotency-Key`. Un reintento con la misma clave y el mismo cuerpo devuelve la misma reserva; la misma clave con otro cuerpo responde `422`.
- **Pendiente con vencimiento.** Una reserva nace `PENDING`, bloquea el horario durante 5 minutos y debe confirmarse. Un job la cancela al vencer y libera la disponibilidad.
- **Staff de solo lectura.** El personal puede consultar su agenda y sus reservas, pero no confirmar, cancelar ni completar. Esas acciones son de cliente o administrador según la transición.
- **Zona horaria explícita.** `timestamptz` en base de datos, minutos locales para horarios de trabajo y `SPA_TIMEZONE` como configuración.
- **Caché tolerante a fallos.** Redis acelera la disponibilidad, pero si no responde la API calcula contra PostgreSQL. La invalidación usa una versión por especialista.
- **Sin pagos ni reprogramación.** El alcance excluye cobros y cambios de horario; una reserva se cancela y se crea de nuevo.

## CI/CD

- `.github/workflows/ci.yml` ejecuta lint, typecheck, pruebas unitarias, pruebas de frontend, build, verificación del OpenAPI, migraciones de test y pruebas de integración con PostgreSQL y Redis.
- `.github/workflows/publish.yml` construye y publica las imágenes de backend y frontend en GHCR al hacer push a `main` o crear un tag `v*`.

Las imágenes usan Node 22. El entorno local puede usar Node 24 dentro del rango declarado en `package.json`.

## Seguridad y alcance

- Las contraseñas se almacenan con Argon2id.
- El access token dura 15 minutos. El refresh token rota, se guarda hasheado y su reutilización revoca la familia completa.
- La cookie de refresh es `httpOnly`, `SameSite=Lax` y limita su path a `/api/auth`.
- Hay rate limits globales, de autenticación y de creación de reservas.
- Los errores usan `{ error: { code, message, details?, requestId } }`.
- No se versionan secretos. `.env` está ignorado.
- El modo `COOKIE_SECURE=false` es solo para desarrollo local. En producción debe configurarse `true` y servir la aplicación por HTTPS.

La aplicación no está pensada para producción real sin antes resolver los riesgos de [`docs/REVISION.md`](docs/REVISION.md): auditoría de dependencias, rate limiting distribuido, job de expiración único y ausencia de prueba E2E de navegador.
