const errorContent = {
  'application/json': {
    schema: { $ref: '#/components/schemas/Error' },
  },
};

const security = [{ bearerAuth: [] }];

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'AgendaSpa API',
    version: '1.0.0',
    description:
      'API de reservas para spa. Autenticación con access token JWT de 15 minutos y refresh token rotativo en cookie httpOnly.',
  },
  servers: [{ url: '/', description: 'Mismo origen' }],
  tags: [
    { name: 'Salud', description: 'Liveness y readiness' },
    { name: 'Autenticación', description: 'Registro, sesión y perfil' },
    { name: 'Servicios', description: 'Catálogo y administración de servicios' },
    { name: 'Personal', description: 'Staff, horarios y ausencias' },
    { name: 'Disponibilidad', description: 'Slots reservables' },
    { name: 'Reservas', description: 'Ciclo de vida de una reserva' },
    { name: 'Agenda', description: 'Agenda operativa de staff y administración' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token devuelto por login, registro o refresh.',
      },
      refreshCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refresh_token',
        description: 'Refresh token httpOnly con path /api/auth.',
      },
    },
    parameters: {
      IdempotencyKey: {
        name: 'Idempotency-Key',
        in: 'header',
        required: true,
        description:
          'Clave única por cliente y operación. Reintentar con la misma clave devuelve la reserva original.',
        schema: { type: 'string', minLength: 8, maxLength: 128 },
      },
      ServiceId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
      StaffId: {
        name: 'staffId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
      TimeOffId: {
        name: 'timeOffId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
      BookingId: {
        name: 'bookingId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
      Cursor: {
        name: 'cursor',
        in: 'query',
        required: false,
        description: 'Cursor opaco devuelto en nextCursor.',
        schema: { type: 'string', maxLength: 500 },
      },
      Limit: {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
      },
      IncludeInactive: {
        name: 'includeInactive',
        in: 'query',
        required: false,
        description: 'Solo administradores.',
        schema: { type: 'string', enum: ['true', 'false'], default: 'false' },
      },
      AvailabilityDate: {
        name: 'date',
        in: 'query',
        required: true,
        schema: { type: 'string', format: 'date' },
      },
    },
    responses: {
      BadRequest: {
        description: 'Solicitud inválida',
        content: errorContent,
      },
      Unauthorized: {
        description: 'No autenticado o token inválido',
        content: errorContent,
      },
      Forbidden: {
        description: 'Sin permisos para la acción',
        content: errorContent,
      },
      NotFound: {
        description: 'Recurso no encontrado',
        content: errorContent,
      },
      Conflict: {
        description: 'Conflicto de estado, solapamiento o nombre duplicado',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: {
                code: 'SLOT_TAKEN',
                message: 'The selected slot is no longer available',
                requestId: '8d32d78a-0e8c-4e2f-8c37-0f3dfcf2a5a1',
              },
            },
          },
        },
      },
      ValidationError: {
        description: 'Error de validación Zod',
        content: errorContent,
      },
      RateLimited: {
        description: 'Demasiadas solicitudes',
        content: errorContent,
      },
      ServerError: {
        description: 'Error interno',
        content: errorContent,
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message', 'requestId'],
            properties: {
              code: { type: 'string', example: 'SLOT_TAKEN' },
              message: { type: 'string' },
              details: { type: 'object', additionalProperties: true, nullable: true },
              requestId: { type: 'string' },
            },
          },
        },
      },
      Role: {
        type: 'string',
        enum: ['ADMIN', 'STAFF', 'CLIENT'],
      },
      BookingStatus: {
        type: 'string',
        enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
      },
      User: {
        type: 'object',
        required: ['id', 'email', 'fullName', 'phone', 'role', 'staffId'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          fullName: { type: 'string' },
          phone: { type: 'string', nullable: true },
          role: { $ref: '#/components/schemas/Role' },
          staffId: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      AuthResponse: {
        type: 'object',
        required: ['accessToken', 'user'],
        properties: {
          accessToken: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['email', 'password', 'fullName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8, maxLength: 128 },
          fullName: { type: 'string', minLength: 2, maxLength: 120 },
          phone: { type: 'string', minLength: 6, maxLength: 30 },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1, maxLength: 128 },
        },
      },
      Service: {
        type: 'object',
        required: [
          'id',
          'name',
          'description',
          'durationMinutes',
          'priceCents',
          'isActive',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          durationMinutes: { type: 'integer', minimum: 15, maximum: 480 },
          priceCents: { type: 'integer', minimum: 0 },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ServiceInput: {
        type: 'object',
        required: ['name', 'durationMinutes', 'priceCents'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 120 },
          description: { type: 'string', maxLength: 1000 },
          durationMinutes: { type: 'integer', minimum: 15, maximum: 480 },
          priceCents: { type: 'integer', minimum: 0 },
        },
      },
      ServiceUpdateInput: {
        type: 'object',
        minProperties: 1,
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 120 },
          description: { type: 'string', maxLength: 1000, nullable: true },
          durationMinutes: { type: 'integer', minimum: 15, maximum: 480 },
          priceCents: { type: 'integer', minimum: 0 },
          isActive: { type: 'boolean' },
        },
      },
      Staff: {
        type: 'object',
        required: ['id', 'fullName', 'bio', 'isActive', 'services'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string' },
          email: {
            type: 'string',
            format: 'email',
            description: 'Solo visible para administradores.',
          },
          phone: {
            type: 'string',
            nullable: true,
            description: 'Solo visible para administradores.',
          },
          bio: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
          services: {
            type: 'array',
            items: { $ref: '#/components/schemas/StaffService' },
          },
        },
      },
      StaffService: {
        type: 'object',
        required: ['id', 'name', 'durationMinutes', 'priceCents'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          durationMinutes: { type: 'integer' },
          priceCents: { type: 'integer' },
        },
      },
      StaffInput: {
        type: 'object',
        required: ['email', 'password', 'fullName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8, maxLength: 128 },
          fullName: { type: 'string', minLength: 2, maxLength: 120 },
          phone: { type: 'string', minLength: 6, maxLength: 30 },
          bio: { type: 'string', maxLength: 1000 },
          serviceIds: {
            type: 'array',
            maxItems: 50,
            items: { type: 'string', format: 'uuid' },
          },
        },
      },
      StaffUpdateInput: {
        type: 'object',
        minProperties: 1,
        properties: {
          password: { type: 'string', minLength: 8, maxLength: 128 },
          fullName: { type: 'string', minLength: 2, maxLength: 120 },
          phone: { type: 'string', minLength: 6, maxLength: 30, nullable: true },
          bio: { type: 'string', maxLength: 1000, nullable: true },
          isActive: { type: 'boolean' },
          serviceIds: {
            type: 'array',
            maxItems: 50,
            items: { type: 'string', format: 'uuid' },
          },
        },
      },
      WorkingHour: {
        type: 'object',
        required: ['weekday', 'startMinute', 'endMinute'],
        properties: {
          weekday: {
            type: 'integer',
            minimum: 1,
            maximum: 7,
            description: 'Día ISO: 1 lunes, 7 domingo.',
          },
          startMinute: {
            type: 'integer',
            minimum: 0,
            maximum: 1439,
            description: 'Minutos desde medianoche en la zona del spa.',
          },
          endMinute: {
            type: 'integer',
            minimum: 1,
            maximum: 1440,
            description: 'Minutos desde medianoche en la zona del spa.',
          },
        },
      },
      WorkingHoursInput: {
        type: 'object',
        required: ['hours'],
        properties: {
          hours: {
            type: 'array',
            maxItems: 21,
            items: { $ref: '#/components/schemas/WorkingHour' },
          },
        },
      },
      TimeOff: {
        type: 'object',
        required: ['id', 'staffId', 'startAt', 'endAt', 'reason', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          staffId: { type: 'string', format: 'uuid' },
          startAt: { type: 'string', format: 'date-time' },
          endAt: { type: 'string', format: 'date-time' },
          reason: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      TimeOffInput: {
        type: 'object',
        required: ['startAt', 'endAt'],
        properties: {
          startAt: { type: 'string', format: 'date-time' },
          endAt: { type: 'string', format: 'date-time' },
          reason: { type: 'string', maxLength: 500 },
        },
      },
      BookingService: {
        type: 'object',
        required: ['id', 'name', 'durationMinutes', 'priceCents'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          durationMinutes: { type: 'integer' },
          priceCents: { type: 'integer' },
        },
      },
      BookingStaff: {
        type: 'object',
        required: ['id', 'fullName'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string' },
        },
      },
      BookingClient: {
        type: 'object',
        required: ['id', 'fullName', 'email'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
      },
      Booking: {
        type: 'object',
        required: [
          'id',
          'status',
          'startAt',
          'endAt',
          'expiresAt',
          'confirmedAt',
          'cancelledAt',
          'completedAt',
          'createdAt',
          'service',
          'staff',
          'client',
        ],
        properties: {
          id: { type: 'string', format: 'uuid' },
          status: { $ref: '#/components/schemas/BookingStatus' },
          startAt: { type: 'string', format: 'date-time' },
          endAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
          confirmedAt: { type: 'string', format: 'date-time', nullable: true },
          cancelledAt: { type: 'string', format: 'date-time', nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          service: { $ref: '#/components/schemas/BookingService' },
          staff: { $ref: '#/components/schemas/BookingStaff' },
          client: { $ref: '#/components/schemas/BookingClient' },
        },
      },
      BookingInput: {
        type: 'object',
        required: ['serviceId', 'staffId', 'startAt'],
        properties: {
          serviceId: { type: 'string', format: 'uuid' },
          staffId: { type: 'string', format: 'uuid' },
          startAt: {
            type: 'string',
            format: 'date-time',
            description:
              'Debe caer en un slot de la grilla de 15 minutos y dentro del horario del staff.',
          },
        },
      },
      BookingActionResponse: {
        type: 'object',
        required: ['booking'],
        properties: {
          booking: { $ref: '#/components/schemas/Booking' },
        },
      },
      BookingCreateResponse: {
        type: 'object',
        required: ['booking', 'replayed'],
        properties: {
          booking: { $ref: '#/components/schemas/Booking' },
          replayed: { type: 'boolean' },
        },
      },
      BookingPage: {
        type: 'object',
        required: ['data', 'nextCursor'],
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Booking' },
          },
          nextCursor: { type: 'string', nullable: true },
        },
      },
      AvailabilitySlot: {
        type: 'object',
        required: ['startAt', 'endAt'],
        properties: {
          startAt: { type: 'string', format: 'date-time' },
          endAt: { type: 'string', format: 'date-time' },
        },
      },
      Availability: {
        type: 'object',
        required: ['staffId', 'serviceId', 'date', 'timeZone', 'slots'],
        properties: {
          staffId: { type: 'string', format: 'uuid' },
          serviceId: { type: 'string', format: 'uuid' },
          date: { type: 'string', format: 'date' },
          timeZone: { type: 'string', example: 'America/Lima' },
          slots: {
            type: 'array',
            items: { $ref: '#/components/schemas/AvailabilitySlot' },
          },
        },
      },
      AvailabilityResponse: {
        type: 'object',
        required: ['availability'],
        properties: {
          availability: { $ref: '#/components/schemas/Availability' },
        },
      },
      Health: {
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string', example: 'ok' } },
      },
      Readiness: {
        type: 'object',
        required: ['status', 'checks'],
        properties: {
          status: { type: 'string', enum: ['ready', 'degraded', 'not_ready'] },
          checks: {
            type: 'object',
            required: ['database', 'redis'],
            properties: {
              database: { type: 'string', enum: ['ok', 'down'] },
              redis: { type: 'string', enum: ['ok', 'degraded'] },
            },
          },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Salud'],
        summary: 'Liveness',
        responses: {
          200: {
            description: 'Proceso vivo',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Health' },
              },
            },
          },
        },
      },
    },
    '/api/ready': {
      get: {
        tags: ['Salud'],
        summary: 'Readiness',
        description:
          'Falla con 503 si PostgreSQL no responde. Redis degradado no bloquea el tráfico porque la caché es fail-open.',
        responses: {
          200: {
            description: 'Listo o degradado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Readiness' },
              },
            },
          },
          503: {
            description: 'Base de datos no disponible',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Readiness' },
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Autenticación'],
        summary: 'Registrar cliente',
        description: 'Crea una cuenta CLIENT y abre sesión. El rol no se puede elegir.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterInput' },
            },
          },
        },
        responses: {
          201: {
            description: 'Cuenta creada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          409: { $ref: '#/components/responses/Conflict' },
          422: { $ref: '#/components/responses/ValidationError' },
          429: { $ref: '#/components/responses/RateLimited' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginInput' },
            },
          },
        },
        responses: {
          200: {
            description: 'Sesión creada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          422: { $ref: '#/components/responses/ValidationError' },
          429: { $ref: '#/components/responses/RateLimited' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Autenticación'],
        summary: 'Rotar refresh token',
        description:
          'Rota el refresh token y devuelve un access token nuevo. Reutilizar un token revocado invalida toda la familia.',
        security: [{ refreshCookie: [] }],
        responses: {
          200: {
            description: 'Sesión renovada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/RateLimited' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Autenticación'],
        summary: 'Cerrar sesión',
        description: 'Revoca la familia de refresh tokens y limpia la cookie.',
        security: [{ refreshCookie: [] }],
        responses: {
          204: { description: 'Sesión cerrada' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Autenticación'],
        summary: 'Perfil actual',
        security,
        responses: {
          200: {
            description: 'Perfil',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['user'],
                  properties: { user: { $ref: '#/components/schemas/User' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/services': {
      get: {
        tags: ['Servicios'],
        summary: 'Listar servicios',
        description: 'Público: solo activos. Administrador: puede incluir inactivos.',
        parameters: [{ $ref: '#/components/parameters/IncludeInactive' }],
        responses: {
          200: {
            description: 'Servicios',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Service' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
      post: {
        tags: ['Servicios'],
        summary: 'Crear servicio',
        security,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ServiceInput' },
            },
          },
        },
        responses: {
          201: {
            description: 'Servicio creado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['service'],
                  properties: { service: { $ref: '#/components/schemas/Service' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          409: { $ref: '#/components/responses/Conflict' },
          422: { $ref: '#/components/responses/ValidationError' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/services/{id}': {
      get: {
        tags: ['Servicios'],
        summary: 'Obtener servicio',
        parameters: [{ $ref: '#/components/parameters/ServiceId' }],
        responses: {
          200: {
            description: 'Servicio',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['service'],
                  properties: { service: { $ref: '#/components/schemas/Service' } },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
      patch: {
        tags: ['Servicios'],
        summary: 'Actualizar servicio',
        security,
        parameters: [{ $ref: '#/components/parameters/ServiceId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ServiceUpdateInput' },
            },
          },
        },
        responses: {
          200: {
            description: 'Servicio actualizado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['service'],
                  properties: { service: { $ref: '#/components/schemas/Service' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/Conflict' },
          422: { $ref: '#/components/responses/ValidationError' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
      delete: {
        tags: ['Servicios'],
        summary: 'Desactivar servicio',
        description: 'Soft delete: conserva reservas históricas.',
        security,
        parameters: [{ $ref: '#/components/parameters/ServiceId' }],
        responses: {
          204: { description: 'Servicio desactivado' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/staff': {
      get: {
        tags: ['Personal'],
        summary: 'Listar staff',
        parameters: [
          {
            name: 'serviceId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
          { $ref: '#/components/parameters/IncludeInactive' },
        ],
        responses: {
          200: {
            description: 'Staff',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Staff' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
      post: {
        tags: ['Personal'],
        summary: 'Crear integrante de staff',
        security,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StaffInput' },
            },
          },
        },
        responses: {
          201: {
            description: 'Staff creado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['staff'],
                  properties: { staff: { $ref: '#/components/schemas/Staff' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          409: { $ref: '#/components/responses/Conflict' },
          422: { $ref: '#/components/responses/ValidationError' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/staff/{staffId}': {
      get: {
        tags: ['Personal'],
        summary: 'Obtener staff',
        parameters: [{ $ref: '#/components/parameters/StaffId' }],
        responses: {
          200: {
            description: 'Staff',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['staff'],
                  properties: { staff: { $ref: '#/components/schemas/Staff' } },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
      patch: {
        tags: ['Personal'],
        summary: 'Actualizar staff',
        security,
        parameters: [{ $ref: '#/components/parameters/StaffId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StaffUpdateInput' },
            },
          },
        },
        responses: {
          200: {
            description: 'Staff actualizado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['staff'],
                  properties: { staff: { $ref: '#/components/schemas/Staff' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/Conflict' },
          422: { $ref: '#/components/responses/ValidationError' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/staff/{staffId}/working-hours': {
      get: {
        tags: ['Personal'],
        summary: 'Horario semanal',
        security,
        parameters: [{ $ref: '#/components/parameters/StaffId' }],
        responses: {
          200: {
            description: 'Horario',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['hours'],
                  properties: {
                    hours: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/WorkingHour' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
      put: {
        tags: ['Personal'],
        summary: 'Reemplazar horario semanal',
        security,
        parameters: [{ $ref: '#/components/parameters/StaffId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WorkingHoursInput' },
            },
          },
        },
        responses: {
          200: {
            description: 'Horario actualizado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['hours'],
                  properties: {
                    hours: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/WorkingHour' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          422: { $ref: '#/components/responses/ValidationError' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/staff/{staffId}/time-off': {
      get: {
        tags: ['Personal'],
        summary: 'Listar ausencias',
        security,
        parameters: [{ $ref: '#/components/parameters/StaffId' }],
        responses: {
          200: {
            description: 'Ausencias',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/TimeOff' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
      post: {
        tags: ['Personal'],
        summary: 'Crear ausencia',
        description: 'No puede solaparse con reservas activas ni con otra ausencia.',
        security,
        parameters: [{ $ref: '#/components/parameters/StaffId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TimeOffInput' },
            },
          },
        },
        responses: {
          201: {
            description: 'Ausencia creada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['timeOff'],
                  properties: { timeOff: { $ref: '#/components/schemas/TimeOff' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/Conflict' },
          422: { $ref: '#/components/responses/ValidationError' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/staff/{staffId}/time-off/{timeOffId}': {
      delete: {
        tags: ['Personal'],
        summary: 'Eliminar ausencia',
        security,
        parameters: [
          { $ref: '#/components/parameters/StaffId' },
          { $ref: '#/components/parameters/TimeOffId' },
        ],
        responses: {
          204: { description: 'Ausencia eliminada' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/availability': {
      get: {
        tags: ['Disponibilidad'],
        summary: 'Slots disponibles',
        description:
          'Calcula slots de 15 minutos en la zona horaria del spa, descontando horario, ausencias y reservas activas. Caché Redis de 30 segundos con claves versionadas; si Redis falla, calcula desde PostgreSQL.',
        security,
        parameters: [
          {
            name: 'serviceId',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'staffId',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          { $ref: '#/components/parameters/AvailabilityDate' },
        ],
        responses: {
          200: {
            description: 'Disponibilidad',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AvailabilityResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          422: { $ref: '#/components/responses/ValidationError' },
          429: { $ref: '#/components/responses/RateLimited' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/bookings': {
      post: {
        tags: ['Reservas'],
        summary: 'Crear reserva pendiente',
        description:
          'Solo CLIENT. Usa transacción y la restricción EXCLUDE de PostgreSQL como árbitro final ante concurrencia. La reserva vence a los 5 minutos si nadie la confirma.',
        security,
        parameters: [{ $ref: '#/components/parameters/IdempotencyKey' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BookingInput' },
            },
          },
        },
        responses: {
          201: {
            description: 'Reserva creada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BookingCreateResponse' },
              },
            },
          },
          200: {
            description: 'Replay idempotente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BookingCreateResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/Conflict' },
          422: { $ref: '#/components/responses/ValidationError' },
          429: { $ref: '#/components/responses/RateLimited' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
      get: {
        tags: ['Reservas'],
        summary: 'Listar reservas',
        description: 'Administrador ve todas; staff solo las propias.',
        security,
        parameters: [
          {
            name: 'staffId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { $ref: '#/components/schemas/BookingStatus' },
          },
          {
            name: 'from',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'to',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date-time' },
          },
          { $ref: '#/components/parameters/Cursor' },
          { $ref: '#/components/parameters/Limit' },
        ],
        responses: {
          200: {
            description: 'Página de reservas',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BookingPage' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          422: { $ref: '#/components/responses/ValidationError' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/bookings/me': {
      get: {
        tags: ['Reservas'],
        summary: 'Mis reservas',
        security,
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { $ref: '#/components/schemas/BookingStatus' },
          },
          { $ref: '#/components/parameters/Cursor' },
          { $ref: '#/components/parameters/Limit' },
        ],
        responses: {
          200: {
            description: 'Página de reservas del cliente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BookingPage' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          422: { $ref: '#/components/responses/ValidationError' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/bookings/{bookingId}': {
      get: {
        tags: ['Reservas'],
        summary: 'Obtener reserva',
        security,
        parameters: [{ $ref: '#/components/parameters/BookingId' }],
        responses: {
          200: {
            description: 'Reserva',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BookingActionResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/bookings/{bookingId}/confirm': {
      post: {
        tags: ['Reservas'],
        summary: 'Confirmar reserva pendiente',
        description: 'Cliente propietario o administrador.',
        security,
        parameters: [{ $ref: '#/components/parameters/BookingId' }],
        responses: {
          200: {
            description: 'Reserva confirmada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BookingActionResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/Conflict' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/bookings/{bookingId}/cancel': {
      post: {
        tags: ['Reservas'],
        summary: 'Cancelar reserva',
        description:
          'El cliente debe cancelar con al menos 24 horas de anticipación. El administrador puede cancelar sin esa ventana. Staff es de solo lectura.',
        security,
        parameters: [{ $ref: '#/components/parameters/BookingId' }],
        responses: {
          200: {
            description: 'Reserva cancelada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BookingActionResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/Conflict' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/bookings/{bookingId}/complete': {
      post: {
        tags: ['Reservas'],
        summary: 'Completar reserva',
        description: 'Solo administrador, después de la hora de inicio.',
        security,
        parameters: [{ $ref: '#/components/parameters/BookingId' }],
        responses: {
          200: {
            description: 'Reserva completada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BookingActionResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/Conflict' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
    '/api/agenda': {
      get: {
        tags: ['Agenda'],
        summary: 'Agenda operativa',
        description:
          'Staff ve solo su agenda. Administrador puede filtrar por staff. Rango máximo de 31 días.',
        security,
        parameters: [
          {
            name: 'from',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'to',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'staffId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'includeCancelled',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['true', 'false'], default: 'false' },
          },
        ],
        responses: {
          200: {
            description: 'Reservas en el rango',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Booking' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          422: { $ref: '#/components/responses/ValidationError' },
          500: { $ref: '#/components/responses/ServerError' },
        },
      },
    },
  },
};
