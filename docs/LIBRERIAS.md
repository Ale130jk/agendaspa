# Librerías y criterios de selección

Todas las dependencias directas están fijadas a una versión exacta. El lockfile (`package-lock.json`) fija el árbol transitivo y CI instala con `npm ci`.

## Backend

| Librería             | Versión | Uso                                              | Motivo                                                                  |
| -------------------- | ------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| `express`            | 4.22.3  | Servidor HTTP y router.                          | Ecosistema maduro, middleware explícito y control total del ciclo HTTP. |
| `typescript`         | 5.9.3   | Tipado estático.                                 | Contratos compartidos y errores detectados en build.                    |
| `@prisma/client`     | 6.19.3  | Acceso a PostgreSQL.                             | Migraciones versionadas, tipos generados y transacciones claras.        |
| `prisma`             | 6.19.3  | CLI, migraciones y seed.                         | Herramienta de desarrollo y despliegue de esquema.                      |
| `zod`                | 3.25.76 | Validación de entorno, bodies, queries y params. | Un solo lenguaje de validación en todo el backend.                      |
| `argon2`             | 0.45.1  | Hash de contraseñas.                             | Argon2id es el estándar actual para almacenamiento de contraseñas.      |
| `jsonwebtoken`       | 9.0.3   | Firma y verificación de access tokens.           | Implementación estable de JWT con issuer y audience.                    |
| `cookie-parser`      | 1.4.7   | Lectura de cookies.                              | Necesario para el refresh token httpOnly.                               |
| `cors`               | 2.8.6   | CORS para desarrollo y orígenes permitidos.      | Configuración explícita del origen del frontend.                        |
| `helmet`             | 8.3.0   | Cabeceras de seguridad.                          | Reduce superficie de ataques comunes sin configuración artesanal.       |
| `express-rate-limit` | 8.7.1   | Rate limiting global, de auth y de reservas.     | Middleware específico para Express; límites por ruta.                   |
| `pino`               | 10.4.0  | Logs estructurados.                              | JSON de bajo costo, niveles y salida apta para contenedores.            |
| `pino-http`          | 11.0.0  | Request logging y request id.                    | Correlaciona errores y peticiones sin inventar un logger propio.        |
| `redis`              | 4.7.1   | Cliente de caché.                                | Cliente oficial, promesas y timeouts controlados por la aplicación.     |
| `date-fns`           | 4.4.0   | Aritmética de fechas.                            | Funciones pequeñas y predecibles; no muta fechas.                       |
| `date-fns-tz`        | 3.2.0   | Conversión entre zona del spa y UTC.             | Evita depender de la zona del servidor o del navegador.                 |
| `dotenv`             | 18.0.9  | Carga de `.env` local.                           | Simple y suficiente; en Compose las variables vienen del entorno.       |
| `swagger-ui-express` | 5.0.1   | Swagger UI en `/docs`.                           | Sirve el contrato OpenAPI sin generar un segundo esquema.               |

### Backend: desarrollo y pruebas

| Librería                    | Versión | Uso                                                      |
| --------------------------- | ------- | -------------------------------------------------------- |
| `tsx`                       | 4.23.15 | Ejecutar TypeScript en desarrollo y seed.                |
| `vitest`                    | 3.2.7   | Pruebas unitarias e integración.                         |
| `supertest`                 | 7.3.1   | Peticiones HTTP contra la app en pruebas de integración. |
| `@types/node`               | 22.20.5 | Tipos de Node 22.                                        |
| `@types/express`            | 4.17.25 | Tipos de Express 4.                                      |
| `@types/jsonwebtoken`       | 9.0.10  | Tipos de JWT.                                            |
| `@types/cookie-parser`      | 1.4.10  | Tipos de cookies.                                        |
| `@types/cors`               | 2.8.19  | Tipos de CORS.                                           |
| `@types/supertest`          | 7.2.1   | Tipos de Supertest.                                      |
| `@types/swagger-ui-express` | 4.1.8   | Tipos de Swagger UI.                                     |

## Frontend

| Librería                        | Versión | Uso                                      | Motivo                                                                          |
| ------------------------------- | ------- | ---------------------------------------- | ------------------------------------------------------------------------------- |
| `react` / `react-dom`           | 18.3.1  | UI.                                      | Base estable y ampliamente soportada.                                           |
| `react-router-dom`              | 7.18.4  | Rutas, layouts y guards.                 | Router declarativo; la versión 7.18.4 corrige avisos de seguridad de la rama 6. |
| `@tanstack/react-query`         | 5.104.5 | Estado del servidor, caché y mutaciones. | Evita sincronizar a mano loading, error y refetch.                              |
| `axios`                         | 1.20.0  | Cliente HTTP e interceptor de refresh.   | Interceptores y reintento único bien acotados.                                  |
| `react-hook-form`               | 7.90.0  | Formularios.                             | Menos renders y validación integrada con Zod.                                   |
| `@hookform/resolvers`           | 3.10.0  | Puente Zod + React Hook Form.            | Un solo esquema para validar formularios.                                       |
| `zod`                           | 3.25.76 | Validación de formularios.               | Coincide con el vocabulario del backend.                                        |
| `tailwindcss`                   | 3.4.19  | Estilos utilitarios.                     | Consistencia visual sin un sistema de componentes pesado.                       |
| `@fontsource-variable/fraunces` | 5.3.0   | Tipografía display.                      | Fuente local, sin depender de Google Fonts en runtime.                          |
| `@fontsource-variable/manrope`  | 5.3.0   | Tipografía de texto.                     | Fuente local y variable.                                                        |
| `vite`                          | 6.4.5   | Dev server y build.                      | Arranque rápido y build pequeño.                                                |
| `@vitejs/plugin-react`          | 4.7.0   | Fast Refresh y JSX.                      | Integración oficial con React.                                                  |

### Frontend: desarrollo y pruebas

| Librería                      | Versión | Uso                               |
| ----------------------------- | ------- | --------------------------------- |
| `vitest`                      | 3.2.7   | Runner de pruebas.                |
| `jsdom`                       | 30.1.3  | Entorno DOM para pruebas.         |
| `@testing-library/react`      | 16.3.3  | Render y consultas accesibles.    |
| `@testing-library/jest-dom`   | 7.0.1   | Matchers de DOM.                  |
| `@testing-library/user-event` | 14.6.8  | Interacciones de usuario.         |
| `@testing-library/dom`        | 10.4.2  | Dependencia de Testing Library.   |
| `@types/react`                | 18.3.31 | Tipos de React.                   |
| `@types/react-dom`            | 18.3.7  | Tipos de React DOM.               |
| `@types/node`                 | 22.20.5 | Tipos de Node para configuración. |
| `postcss`                     | 8.5.31  | Pipeline de Tailwind.             |
| `autoprefixer`                | 10.6.1  | Prefijos de navegador.            |
| `typescript`                  | 5.9.3   | Tipado y build.                   |

## Raíz

| Librería                      | Versión | Uso                              |
| ----------------------------- | ------- | -------------------------------- |
| `eslint`                      | 9.39.5  | Lint con flat config.            |
| `@eslint/js`                  | 9.39.5  | Reglas recomendadas.             |
| `typescript-eslint`           | 8.72.0  | Reglas y parser de TypeScript.   |
| `eslint-plugin-react-hooks`   | 7.1.1   | Reglas de hooks.                 |
| `eslint-plugin-react-refresh` | 0.5.7   | Compatibilidad con Fast Refresh. |
| `globals`                     | 17.13.0 | Globales de Node y navegador.    |
| `prettier`                    | 3.9.10  | Formato uniforme.                |
| `typescript`                  | 5.9.3   | Build y typecheck de workspaces. |

## Herramientas fuera de npm

| Herramienta    | Uso                                       |
| -------------- | ----------------------------------------- |
| Docker Compose | Stack local reproducible.                 |
| PostgreSQL 16  | Fuente de verdad; extensión `btree_gist`. |
| Redis 7        | Caché de disponibilidad.                  |
| Nginx          | Servir la SPA y proxy inverso.            |
| k6             | Prueba de carga de lecturas.              |
| GitHub Actions | CI y publicación de imágenes en GHCR.     |

## Decisiones que se descartaron

- **Next.js:** el proyecto busca separar explícitamente SPA y API REST; no hay necesidad de SSR ni de rutas de servidor.
- **Redux:** el estado del servidor vive en React Query y la sesión en un contexto pequeño. Un store global añadiría ceremonia.
- **Mongoose u otro ODM:** el problema central es de integridad relacional y solapamiento temporal. PostgreSQL con una restricción de exclusión es la herramienta correcta.
- **Luxon o Day.js:** `date-fns` + `date-fns-tz` cubre el cálculo con funciones explícitas y tree-shaking.
- **Generador OpenAPI basado en decoradores:** se prefirió un objeto TypeScript versionado, generado a JSON y verificado en CI. Menos magia y un diff legible.
- **Tailwind 4:** se mantiene Tailwind 3.4 por estabilidad de configuración y compatibilidad con el resto del toolchain.
- **Prisma 7:** la actualización es un cambio mayor que exige migrar la configuración y retestar migraciones. Se deja como deuda documentada, no se fuerza en esta entrega.

## Riesgo de dependencias

`npm audit --omit=dev` reporta tres vulnerabilidades altas en `deepmerge-ts`, transitiva de la CLI de Prisma. La CLI se usa para generar el cliente y aplicar migraciones; no participa en el manejo de peticiones de la API. La corrección disponible implica Prisma 7 y debe hacerse con una migración de configuración y una nueva ejecución de pruebas de integración.

La versión de React Router se actualizó a 7.18.4 para eliminar los avisos de la rama 6. El frontend compila, pasa sus pruebas y genera el build con esa versión.

## Política de versiones

- Dependencias directas: versión exacta, sin `^` ni `~`.
- Instalación reproducible: `npm ci`.
- Node: 22 en Docker y CI; el rango local acepta 22, 23 y 24.
- Cambios de dependencias: PR separado, con typecheck, lint, pruebas, build y revisión de `npm audit`.
