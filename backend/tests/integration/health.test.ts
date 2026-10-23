import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, resetDatabase } from './helpers';

describe('operational endpoints', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('reports liveness and readiness', async () => {
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok' });

    const ready = await request(app).get('/ready');
    expect(ready.status).toBe(200);
    expect(['ready', 'degraded']).toContain(ready.body.status);
    expect(ready.body.checks.database).toBe('ok');
    expect(['ok', 'degraded']).toContain(ready.body.checks.redis);
  });

  it('serves the OpenAPI document and Swagger UI', async () => {
    const spec = await request(app).get('/openapi.json');
    expect(spec.status).toBe(200);
    expect(spec.body.openapi).toBe('3.0.3');
    expect(Object.keys(spec.body.paths)).toHaveLength(22);
    expect(spec.body.paths['/api/bookings'].post).toBeDefined();

    const docs = await request(app).get('/docs/');
    expect(docs.status).toBe(200);
    expect(docs.text).toContain('AgendaSpa API');
  });

  it('uses the shared error shape for unknown routes', async () => {
    const response = await request(app).get('/api/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Route GET /api/does-not-exist not found',
    });
    expect(typeof response.body.error.requestId).toBe('string');
  });

  it('rejects malformed JSON with a client error', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
    expect(typeof response.body.error.requestId).toBe('string');
  });
});
