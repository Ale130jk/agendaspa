import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, cookieFrom, createUser, resetDatabase } from './helpers';

describe('auth API', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('registers a client, returns an access token and opens a session', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'ana@test.local',
      password: 'AnaPassword123!',
      fullName: 'Ana Flores',
      phone: '+51 999 111 000',
    });

    expect(response.status).toBe(201);
    expect(typeof response.body.accessToken).toBe('string');
    expect(response.body.user).toMatchObject({
      email: 'ana@test.local',
      fullName: 'Ana Flores',
      role: 'CLIENT',
      staffId: null,
    });
    expect(cookieFrom(response, 'refresh_token')).toContain('refresh_token=');

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${response.body.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('ana@test.local');
  });

  it('rejects duplicate emails and wrong credentials', async () => {
    await createUser({
      email: 'duplicate@test.local',
      password: 'CorrectPassword123!',
      fullName: 'Duplicate User',
    });

    const duplicate = await request(app).post('/api/auth/register').send({
      email: 'duplicate@test.local',
      password: 'AnotherPassword123!',
      fullName: 'Another User',
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('EMAIL_TAKEN');

    const wrong = await request(app).post('/api/auth/login').send({
      email: 'duplicate@test.local',
      password: 'WrongPassword123!',
    });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('rotates refresh tokens and revokes the family when a token is reused', async () => {
    const agent = request.agent(app);
    const registered = await agent.post('/api/auth/register').send({
      email: 'rotate@test.local',
      password: 'RotatePassword123!',
      fullName: 'Rotate User',
    });
    expect(registered.status).toBe(201);

    const originalCookie = cookieFrom(registered, 'refresh_token');
    const refreshed = await agent.post('/api/auth/refresh');
    expect(refreshed.status).toBe(200);
    expect(typeof refreshed.body.accessToken).toBe('string');

    const rotatedCookie = cookieFrom(refreshed, 'refresh_token');
    expect(rotatedCookie).not.toBe(originalCookie);

    const reuse = await request(app).post('/api/auth/refresh').set('Cookie', originalCookie);
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('AUTH_REFRESH_REUSED');

    const familyRevoked = await request(app).post('/api/auth/refresh').set('Cookie', rotatedCookie);
    expect(familyRevoked.status).toBe(401);
    expect(['AUTH_REFRESH_REUSED', 'AUTH_INVALID_REFRESH']).toContain(
      familyRevoked.body.error.code,
    );
  });

  it('revokes the session on logout', async () => {
    const agent = request.agent(app);
    const registered = await agent.post('/api/auth/register').send({
      email: 'logout@test.local',
      password: 'LogoutPassword123!',
      fullName: 'Logout User',
    });
    expect(registered.status).toBe(201);
    const cookie = cookieFrom(registered, 'refresh_token');

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(204);

    const refresh = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(refresh.status).toBe(401);
  });

  it('rejects disabled accounts', async () => {
    await createUser({
      email: 'disabled@test.local',
      password: 'DisabledPassword123!',
      fullName: 'Disabled User',
      isActive: false,
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'disabled@test.local',
      password: 'DisabledPassword123!',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_ACCOUNT_DISABLED');
  });
});
