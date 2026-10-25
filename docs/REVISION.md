# Revisión técnica

Fecha: 2026-10-22

## Resultado ejecutivo

La aplicación está implementada de punta a punta: autenticación, catálogo, staff, disponibilidad, reservas, agenda, panel administrativo, OpenAPI, Docker Compose y workflows de CI/publicación.

La verificación estática, las pruebas unitarias, las 20 pruebas de integración, el build real de las imágenes, el arranque de Docker Compose y la prueba de carga con k6 están completos. La primera ejecución de los workflows en GitHub queda pendiente de publicar `main`.

No se declara el proyecto como listo para producción: quedan riesgos de auditoría de dependencias, prueba E2E de navegador, rate limiting distribuido y job de expiración para múltiples réplicas.

## Evidencia ejecutada

| Verificación                | Comando                                                       | Resultado                                                                                    |
| --------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Instalación reproducible    | `npm ci`                                                      | PASS: 556 paquetes instalados desde el lockfile.                                             |
| Generación de Prisma Client | `npm run db:generate`                                         | PASS: cliente 6.19.3 generado.                                                               |
| Typecheck backend           | `npm run typecheck`                                           | PASS, sin errores.                                                                           |
| Typecheck frontend          | `npm run typecheck`                                           | PASS, sin errores.                                                                           |
| Lint                        | `npm run lint`                                                | PASS, 0 errores y 0 warnings.                                                                |
| Unitarias backend           | `npm run test:unit -w backend`                                | PASS: 11/11 pruebas, 3 archivos.                                                             |
| Frontend                    | `npm run test -w frontend`                                    | PASS: 8/8 pruebas, 2 archivos.                                                               |
| Build backend               | `npm run build`                                               | PASS: Prisma + `tsc`.                                                                        |
| Build frontend              | `npm run build`                                               | PASS: Vite, 455.76 kB JS (139.84 kB gzip).                                                   |
| OpenAPI                     | `npm run docs:openapi`                                        | PASS: 22 paths y 31 schemas.                                                                 |
| Contrato OpenAPI            | inspección del JSON                                           | PASS: `Staff` incluye `phone`; confirmar y completar documentados.                           |
| Compose estático            | `docker compose --env-file .env.example config --quiet`       | PASS: configuración válida.                                                                  |
| Smoke HTTP del build        | `supertest` contra `backend/dist/app`                         | PASS: `/health` 200, `/openapi.json` 200 con 22 paths, ruta inexistente 404 con `requestId`. |
| Formato                     | `npm run format:check`                                        | PASS después de `npm run format`.                                                            |
| Build de imágenes           | `docker compose up --build -d`                                | PASS: backend y frontend construidos; PostgreSQL 16 y Redis 7 healthy.                       |
| Runtime de Compose          | `docker compose ps`                                           | PASS: cuatro contenedores `Up (healthy)`.                                                    |
| Migraciones y seed          | logs de arranque del backend                                  | PASS: migración `20261022000000_init` aplicada y “Demo data ready.”                          |
| Proxy y estáticos           | `GET /`, `/reservar`, `/login`, `/docs/`, `/health`, `/ready` | PASS: 200; `/ready` reporta `database: ok` y `redis: ok`.                                    |
| Flujo demo por API          | login, disponibilidad, crear, replay, confirmar y cancelar    | PASS: `201 PENDING`, replay `200` con el mismo id, `CONFIRMED`, `CANCELLED`.                 |
| Integración en Docker       | suite dentro del contenedor backend                           | PASS: 20/20 pruebas contra PostgreSQL 16 y Redis 7.                                          |
| CI en GitHub                | `gh run watch` sobre `ci.yml`                                 | PASS: lint, typecheck, unitarias, frontend, build, OpenAPI, migraciones e integración.       |
| Publicación GHCR            | `gh run watch` sobre `publish.yml`                            | PASS: imágenes de backend y frontend publicadas.                                             |
| k6                          | `k6 run loadtest/availability.js`                             | PASS: 759 peticiones, 0 % de errores, p95 8.17 ms.                                           |

El smoke HTTP del build usó el backend compilado sin base de datos. El resto de la evidencia se ejecutó contra el stack real de Compose.

## Pruebas de integración

Hay 20 pruebas de integración:

- 5 de autenticación: registro, duplicados, refresh rotativo, reutilización, logout y cuentas deshabilitadas.
- 9 de reservas: idempotencia, 25 peticiones concurrentes con claves distintas, reintentos concurrentes con una sola clave, confirmación, cancelación, ventana de 24 horas, expiración, agenda, roles y paginación.
- 2 de catálogo y staff: CRUD administrativo, teléfono visible solo para admin, horarios y ausencias.
- 4 de salud y contrato: liveness/readiness, OpenAPI/Swagger, error compartido y JSON malformado con `400 INVALID_JSON`.

Se ejecutaron dentro del contenedor `backend`, en la red de Compose, contra PostgreSQL 16 y Redis 7:

```powershell
docker compose exec -T db createdb -U agendaspa agendaspa_test
docker compose exec -T backend sh -lc 'DATABASE_URL="postgresql://agendaspa:agendaspa_dev_password@db:5432/agendaspa_test?schema=public" npm run db:migrate:deploy -w backend'
docker compose exec -T backend sh -lc 'TEST_DATABASE_URL="postgresql://agendaspa:agendaspa_dev_password@db:5432/agendaspa_test?schema=public" TEST_REDIS_URL="redis://redis:6379/1" npm run test:integration -w backend'
```

Resultado: `4` archivos, `20` pruebas, `0` fallos. La prueba de reintentos con una sola clave se repitió tres veces adicionales para confirmar que los conflictos de disponibilidad también resuelven la reserva original.

La suite está diseñada para fallar de forma segura: `resetDatabase` rechaza truncar una base cuyo nombre no contenga `test`.

## Docker Compose en ejecución

La construcción y el arranque se ejecutaron con Docker Engine 29.7.2 y Compose v5.3.1:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

Comprobado:

- Build real de `backend/Dockerfile` y `frontend/Dockerfile`.
- Migraciones y seed dentro del contenedor.
- Healthchecks y orden de arranque: PostgreSQL y Redis sanos antes del backend; el frontend espera al backend.
- Proxy de Nginx para `/api`, `/docs`, `/openapi.json`, `/health` y `/ready`.
- Fallback de SPA para `/reservar` y `/login`.
- Login demo, disponibilidad, reserva, replay idempotente, confirmación y cancelación.
- Staff recibe `403 AUTH_FORBIDDEN` al intentar crear una reserva.
- El teléfono del staff aparece en la respuesta administrativa y se omite en la pública.
- JSON malformado responde `400` con `INVALID_JSON` y `requestId`.
- Redis contiene claves versionadas `availability:v*` y `availability:version:*`.

## Prueba de carga

Se instaló k6 2.2.0 y se ejecutó `loadtest/availability.js` con 10 VUs durante 45 segundos. Para medir rendimiento de lectura se elevó `RATE_LIMIT_MAX` a `100000` solo durante la prueba; el límite global por defecto es `300` cada 15 minutos y bloquea una prueba sostenida con `429`.

```powershell
$env:RATE_LIMIT_MAX = "100000"
docker compose up -d --no-build backend
$env:BASE_URL = "http://localhost:8080"
k6 run .\loadtest\availability.js
```

Resultado:

- 759 peticiones HTTP.
- 0 % de errores.
- p95 de 8.17 ms; media de 5.99 ms.
- 100 % de checks.
- 378 iteraciones completas; umbrales `checks > 0.99`, `http_req_failed < 0.01` y `p(95) < 500 ms` cumplidos.

El script usa `K6_MAX_VUS`, no `K6_VUS`, porque k6 interpreta `K6_VUS` como una opción global que reemplaza el escenario de rampa.

## CI en GitHub

La primera ejecución se completó sobre `main`:

- `ci.yml`: PASS en 1m20s. Ejecutó lint, typecheck, pruebas unitarias, pruebas de frontend, build, verificación del OpenAPI, migraciones de test e integración contra PostgreSQL 16 y Redis 7.
- `publish.yml`: PASS. Construyó y publicó `ghcr.io/ale130jk/agendaspa-backend` y `ghcr.io/ale130jk/agendaspa-frontend`.

Solo queda la advertencia de GitHub sobre acciones que todavía apuntan a Node 20 (`actions/checkout@v4`, `actions/setup-node@v4`); el runner las ejecuta con Node 24. No afecta la entrega.

## Cobertura funcional

| Requisito                                              | Estado                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| Registro, login, refresh rotativo, logout              | Verificado en integración contra PostgreSQL 16.                            |
| Roles ADMIN, STAFF y CLIENT                            | Verificado en rutas y servicios.                                           |
| Staff de solo lectura en agenda y reservas             | Verificado; `403` al crear reservas y completar solo permite ADMIN.        |
| Integridad de reservas con GiST                        | Verificado con 25 peticiones concurrentes: exactamente una reserva.        |
| Idempotencia por clave y hash                          | Verificado; misma clave y cuerpo devuelve la reserva original.             |
| Expiración de PENDING a los 5 minutos                  | Verificado con job y liberación de disponibilidad.                         |
| Cancelación de cliente con ventana de 24 horas         | Verificado; el admin puede cancelar fuera de la ventana.                   |
| Disponibilidad por servicio, staff, horario y ausencia | Verificado; 7 pruebas unitarias del calculador y pruebas de integración.   |
| Caché Redis versionada y fail-open                     | Verificado con Redis real; claves versionadas e invalidación observadas.   |
| UI en español, PEN, dirección visual cálida            | Verificado con build y 8 pruebas de frontend.                              |
| OpenAPI en `/docs` y `/openapi.json`                   | Verificado; 22 paths y 31 schemas servidos por Nginx.                      |
| Docker Compose                                         | Verificado: build, arranque, healthchecks, migraciones, seed y proxy.      |
| CI/CD y publicación GHCR                               | Workflows creados; primera ejecución pendiente tras el push.               |
| Documentación                                          | README, arquitectura, librerías, revisión y OpenAPI.                       |
| k6                                                     | Verificado: 10 VUs, 45 s, 0 % de errores y p95 8.17 ms con límite elevado. |

## Riesgos y deuda

1. **Auditoría de dependencias.** `npm audit --omit=dev` reporta 3 vulnerabilidades altas en la cadena de la CLI de Prisma (`prisma`, `@prisma/config`, `deepmerge-ts`). La CLI no participa en el manejo de peticiones, pero está presente en la imagen porque se usa para migrar. La corrección implica Prisma 7, una actualización mayor que requiere migrar configuración y repetir pruebas.
2. **Auditoría completa de desarrollo.** `npm audit` reporta 13 vulnerabilidades (3 moderadas, 8 altas, 2 críticas), concentradas en herramientas de test/build: Vitest, Tinypool, Tailwind, PostCSS, micromatch y Prisma. La corrección automática propone saltos mayores (Vitest 5, Prisma 7). Debe tratarse en un cambio separado.
3. **Sin prueba E2E de navegador.** Hay pruebas de componentes, build y flujo de API, pero no un recorrido Playwright completo contra la UI.
4. **Rate limiting en memoria.** El limitador de Express usa el store por defecto. Con varias réplicas hace falta un store compartido (por ejemplo Redis). Además, el límite global de 300 cada 15 minutos es conservador para lecturas y debe ajustarse según el tráfico esperado.
5. **Job de expiración en proceso.** Funciona para una instancia. Con varias réplicas hace falta un worker dedicado o un lock distribuido.
6. **Carga de escritura no medida.** k6 mide catálogo y disponibilidad; no mide creación concurrente de reservas contra la API. Esa concurrencia está cubierta por integración, no por carga sostenida.
7. **Bundle único.** El JavaScript pesa 455.76 kB (139.84 kB gzip). Es aceptable para el alcance, pero se puede dividir por rutas.
8. **Prisma 7.** `package.json#prisma` está deprecado. La CLI avisa que se eliminará en Prisma 7.
9. **Sin despliegue público.** El alcance es local con Docker Compose y publicación de imágenes en GHCR; no hay hosting ni TLS administrado.

## Cómo cerrar la brecha

1. Publicar `main` y observar `ci.yml` y `publish.yml` en GitHub.
2. Abrir un cambio separado para Prisma 7 y otro para las dependencias de test/build.
3. Añadir una prueba E2E de navegador para reserva, panel y agenda.
4. Mover el rate limiting a Redis antes de escalar a varias réplicas.
5. Convertir el job de expiración en un worker con lock distribuido.
6. Ajustar `RATE_LIMIT_MAX` al tráfico esperado y repetir k6 con el valor definitivo.

## Conclusión

El proyecto está listo para revisión de código y demostración local. La integración real, el build de imágenes, el arranque de Compose y la carga de lectura están verificados. No está listo para producción: faltan auditoría de dependencias, E2E de navegador, rate limiting distribuido y un job de expiración apto para múltiples réplicas.
