import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { expirePendingBookings } from '../../src/modules/bookings/bookings.service';
import { prisma } from '../../src/lib/prisma';
import {
  app,
  auth,
  createService,
  createStaffFixture,
  createUser,
  idempotencyKey,
  localDate,
  localDateTime,
  login,
  resetDatabase,
} from './helpers';

describe('bookings API', () => {
  let adminToken: string;
  let staffToken: string;
  let clientToken: string;
  let clientId: string;
  let staffId: string;
  let serviceId: string;
  let date: string;
  let slot: Date;

  beforeEach(async () => {
    await resetDatabase();

    await createUser({
      email: 'admin-bookings@test.local',
      password: 'AdminPassword123!',
      fullName: 'Bookings Admin',
      role: 'ADMIN',
    });
    const service = await createService({ name: 'Masaje de reservas', durationMinutes: 60 });
    const staff = await createStaffFixture({
      email: 'staff-bookings@test.local',
      password: 'StaffPassword123!',
      fullName: 'Bookings Staff',
      serviceIds: [service.id],
    });
    const client = await createUser({
      email: 'client-bookings@test.local',
      password: 'ClientPassword123!',
      fullName: 'Bookings Client',
    });

    staffId = staff.profile.id;
    clientId = client.id;
    serviceId = service.id;
    date = localDate(7);
    slot = localDateTime(date, '10:00');

    adminToken = await login('admin-bookings@test.local', 'AdminPassword123!');
    staffToken = await login('staff-bookings@test.local', 'StaffPassword123!');
    clientToken = await login('client-bookings@test.local', 'ClientPassword123!');
  });

  function bookingPayload(startAt = slot) {
    return { serviceId, staffId, startAt: startAt.toISOString() };
  }

  async function createBooking(key = idempotencyKey(), startAt = slot) {
    return request(app)
      .post('/api/bookings')
      .set(auth(clientToken))
      .set('Idempotency-Key', key)
      .send(bookingPayload(startAt));
  }

  async function availability() {
    return request(app)
      .get(`/api/availability?serviceId=${serviceId}&staffId=${staffId}&date=${date}`)
      .set(auth(clientToken));
  }

  it('creates a booking and replays the same idempotency key', async () => {
    const key = idempotencyKey();
    const first = await createBooking(key);

    expect(first.status).toBe(201);
    expect(first.body.replayed).toBe(false);
    expect(first.body.booking).toMatchObject({
      status: 'PENDING',
      startAt: slot.toISOString(),
      service: { id: serviceId },
      staff: { id: staffId },
      client: { id: clientId },
    });

    const replay = await createBooking(key);
    expect(replay.status).toBe(200);
    expect(replay.body.replayed).toBe(true);
    expect(replay.body.booking.id).toBe(first.body.booking.id);

    const mismatch = await createBooking(key, localDateTime(date, '10:15'));
    expect(mismatch.status).toBe(422);
    expect(mismatch.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('allows exactly one of 25 concurrent requests for the same slot', async () => {
    const responses = await Promise.all(
      Array.from({ length: 25 }, () => createBooking(idempotencyKey())),
    );

    const created = responses.filter((response) => response.status === 201);
    const conflicts = responses.filter((response) => response.status === 409);

    expect(created).toHaveLength(1);
    expect(conflicts).toHaveLength(24);
    expect(conflicts.every((response) => response.body.error.code === 'SLOT_TAKEN')).toBe(true);
  });

  it('returns the same booking for concurrent retries with one idempotency key', async () => {
    const key = idempotencyKey();
    const responses = await Promise.all(Array.from({ length: 10 }, () => createBooking(key)));

    const created = responses.filter((response) => response.status === 201);
    const replayed = responses.filter((response) => response.status === 200);
    const ids = new Set(responses.map((response) => response.body.booking?.id));

    expect(created).toHaveLength(1);
    expect(replayed).toHaveLength(9);
    expect(ids.size).toBe(1);
  });

  it('confirms, shows the slot as taken and frees it after cancellation', async () => {
    const created = await createBooking();
    const bookingId = created.body.booking.id as string;

    const beforeConfirm = await availability();
    expect(
      beforeConfirm.body.availability.slots.map(
        (slotItem: { startAt: string }) => slotItem.startAt,
      ),
    ).not.toContain(slot.toISOString());

    const confirmed = await request(app)
      .post(`/api/bookings/${bookingId}/confirm`)
      .set(auth(clientToken));
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.booking.status).toBe('CONFIRMED');

    const cancelled = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set(auth(clientToken));
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.booking.status).toBe('CANCELLED');

    const cancelAgain = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set(auth(clientToken));
    expect(cancelAgain.status).toBe(200);
    expect(cancelAgain.body.booking.status).toBe('CANCELLED');

    const afterCancel = await availability();
    expect(
      afterCancel.body.availability.slots.map((slotItem: { startAt: string }) => slotItem.startAt),
    ).toContain(slot.toISOString());
  });

  it('enforces the 24 hour cancellation window only for clients', async () => {
    const created = await createBooking();
    const bookingId = created.body.booking.id as string;
    const nearStart = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        startAt: nearStart,
        endAt: new Date(nearStart.getTime() + 60 * 60 * 1000),
      },
    });

    const clientCancel = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set(auth(clientToken));
    expect(clientCancel.status).toBe(403);
    expect(clientCancel.body.error.code).toBe('CANCELLATION_WINDOW_PASSED');

    const adminCancel = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set(auth(adminToken));
    expect(adminCancel.status).toBe(200);
    expect(adminCancel.body.booking.status).toBe('CANCELLED');
  });

  it('expires pending bookings and frees the slot', async () => {
    const created = await createBooking();
    const bookingId = created.body.booking.id as string;

    await prisma.booking.update({
      where: { id: bookingId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const expiredCount = await expirePendingBookings();
    expect(expiredCount).toBe(1);

    const stored = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(stored.status).toBe('CANCELLED');

    const afterExpiry = await availability();
    expect(
      afterExpiry.body.availability.slots.map((slotItem: { startAt: string }) => slotItem.startAt),
    ).toContain(slot.toISOString());
  });

  it('shows bookings in the staff agenda and restricts client access', async () => {
    const created = await createBooking();
    expect(created.status).toBe(201);

    const from = new Date(slot.getTime() - 60 * 60 * 1000).toISOString();
    const to = new Date(slot.getTime() + 4 * 60 * 60 * 1000).toISOString();

    const agenda = await request(app)
      .get(`/api/agenda?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .set(auth(staffToken));

    expect(agenda.status).toBe(200);
    expect(agenda.body.data.map((booking: { id: string }) => booking.id)).toContain(
      created.body.booking.id,
    );

    const clientAgenda = await request(app)
      .get(`/api/agenda?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .set(auth(clientToken));
    expect(clientAgenda.status).toBe(403);
  });

  it('lets an admin complete a started booking and keeps staff read-only', async () => {
    const created = await createBooking();
    const bookingId = created.body.booking.id as string;

    const confirmed = await request(app)
      .post(`/api/bookings/${bookingId}/confirm`)
      .set(auth(clientToken));
    expect(confirmed.status).toBe(200);

    const startedAt = new Date(Date.now() - 30 * 60 * 1000);
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        startAt: startedAt,
        endAt: new Date(startedAt.getTime() + 60 * 60 * 1000),
      },
    });

    const clientComplete = await request(app)
      .post(`/api/bookings/${bookingId}/complete`)
      .set(auth(clientToken));
    expect(clientComplete.status).toBe(403);

    const staffComplete = await request(app)
      .post(`/api/bookings/${bookingId}/complete`)
      .set(auth(staffToken));
    expect(staffComplete.status).toBe(403);

    const adminComplete = await request(app)
      .post(`/api/bookings/${bookingId}/complete`)
      .set(auth(adminToken));
    expect(adminComplete.status).toBe(200);
    expect(adminComplete.body.booking.status).toBe('COMPLETED');
  });

  it('returns my bookings with cursor pagination', async () => {
    const first = await createBooking(idempotencyKey(), localDateTime(date, '10:00'));
    const second = await createBooking(idempotencyKey(), localDateTime(date, '11:00'));
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const page = await request(app).get('/api/bookings/me?limit=1').set(auth(clientToken));

    expect(page.status).toBe(200);
    expect(page.body.data).toHaveLength(1);
    expect(page.body.nextCursor).toBeTruthy();

    const nextPage = await request(app)
      .get(`/api/bookings/me?limit=1&cursor=${encodeURIComponent(page.body.nextCursor)}`)
      .set(auth(clientToken));

    expect(nextPage.status).toBe(200);
    expect(nextPage.body.data).toHaveLength(1);
    expect(nextPage.body.data[0].id).not.toBe(page.body.data[0].id);
  });
});
