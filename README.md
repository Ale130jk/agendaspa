# AgendaSpa

AgendaSpa es una aplicación web full stack para gestionar las reservas de un spa. Centraliza los servicios, la disponibilidad de los especialistas y el ciclo de vida de cada reserva, con experiencias separadas para clientes, personal y administración.

## Qué incluye

- Registro e inicio de sesión con roles `CLIENT`, `STAFF` y `ADMIN`.
- Catálogo de servicios con duración, precio en soles peruanos (PEN) y especialistas asignados.
- Consulta de disponibilidad por servicio, especialista y fecha.
- Reservas con bloqueo temporal, confirmación, cancelación y expiración automática.
- Agenda del personal y panel administrativo para servicios, especialistas, horarios, ausencias y reservas.
- Historial de reservas del cliente con paginación.
- Control de acceso por rol: el personal consulta, el cliente reserva y el administrador gestiona.

## Alcance

- Las reservas solo las crea un cliente autenticado.
- Una reserva pendiente bloquea el horario durante cinco minutos.
- El cliente puede cancelar hasta 24 horas antes del inicio.
- No hay pagos, reprogramación ni reserva para invitados.
- El personal tiene acceso de solo lectura a su agenda y sus reservas.
- La interfaz está en español y la moneda es PEN.

## Tecnologías

| Capa            | Tecnología                                                                    |
| --------------- | ----------------------------------------------------------------------------- |
| Frontend        | React 18, TypeScript, Vite, React Router 7, TanStack Query, Tailwind CSS      |
| Backend         | Node.js 22, Express 4, TypeScript, Prisma 6, Zod                              |
| Base de datos   | PostgreSQL 16 con `btree_gist` y restricción de exclusión                     |
| Caché           | Redis 7 para disponibilidad                                                   |
| Autenticación   | Argon2id, access JWT de 15 minutos, refresh token rotativo en cookie httpOnly |
| Infraestructura | Docker Compose, Nginx, GitHub Actions, GHCR                                   |
| Pruebas         | Vitest, Supertest, Testing Library, k6                                        |
