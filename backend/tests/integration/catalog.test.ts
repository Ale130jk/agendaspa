import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, auth, createUser, localDate, localDateTime, login, resetDatabase } from './helpers';

describe('catalog, staff and availability API', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('lets admins manage the catalog and staff, and exposes public availability', async () => {
    await createUser({
      email: 'admin@test.local',
      password: 'AdminPassword123!',
      fullName: 'Test Admin',
      role: 'ADMIN',
    });
    await createUser({
      email: 'client@test.local',
      password: 'ClientPassword123!',
      fullName: 'Test Client',
    });

    const adminToken = await login('admin@test.local', 'AdminPassword123!');
    const clientToken = await login('client@test.local', 'ClientPassword123!');

    const serviceResponse = await request(app).post('/api/services').set(auth(adminToken)).send({
      name: 'Masaje de prueba',
      description: 'Un masaje para probar el catÃ¡logo.',
      durationMinutes: 60,
      priceCents: 19_000,
    });

    expect(serviceResponse.status).toBe(201);
    const serviceId = serviceResponse.body.service.id as string;

    const forbiddenService = await request(app).post('/api/services').set(auth(clientToken)).send({
      name: 'No permitido',
      durationMinutes: 60,
      priceCents: 1_000,
    });
    expect(forbiddenService.status).toBe(403);

    const staffResponse = await request(app)
      .post('/api/staff')
      .set(auth(adminToken))
      .send({
        email: 'staff@test.local',
        password: 'StaffPassword123!',
        fullName: 'Test Staff',
        phone: '+51 999 000 111',
        bio: 'Terapeuta de prueba',
        serviceIds: [serviceId],
      });

    expect(staffResponse.status).toBe(201);
    const staffId = staffResponse.body.staff.id as string;
    expect(staffResponse.body.staff.email).toBe('staff@test.local');
    expect(staffResponse.body.staff.phone).toBe('+51 999 000 111');

    const hoursResponse = await request(app)
      .put(`/api/staff/${staffId}/working-hours`)
      .set(auth(adminToken))
      .send({
        hours: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
          weekday,
          startMinute: 9 * 60,
          endMinute: 18 * 60,
        })),
      });
    expect(hoursResponse.status).toBe(200);
    expect(hoursResponse.body.hours).toHaveLength(7);

    const publicServices = await request(app).get('/api/services');
    expect(publicServices.status).toBe(200);
    expect(publicServices.body.data.map((service: { id: string }) => service.id)).toContain(
      serviceId,
    );

    const publicStaff = await request(app).get(`/api/staff?serviceId=${serviceId}`);
    expect(publicStaff.status).toBe(200);
    const listedStaff = publicStaff.body.data.find(
      (member: { id: string }) => member.id === staffId,
    );
    expect(listedStaff).toMatchObject({ fullName: 'Test Staff', isActive: true });
    expect(listedStaff.email).toBeUndefined();
    expect(listedStaff.phone).toBeUndefined();

    const date = localDate(7);
    const availability = await request(app)
      .get(`/api/availability?serviceId=${serviceId}&staffId=${staffId}&date=${date}`)
      .set(auth(clientToken));

    expect(availability.status).toBe(200);
    const slotTimes = availability.body.availability.slots.map((slot: { startAt: string }) =>
      new Date(slot.startAt).toISOString(),
    );
    expect(slotTimes).toContain(localDateTime(date, '10:00').toISOString());

    const timeOffResponse = await request(app)
      .post(`/api/staff/${staffId}/time-off`)
      .set(auth(adminToken))
      .send({
        startAt: localDateTime(date, '15:00').toISOString(),
        endAt: localDateTime(date, '16:00').toISOString(),
        reason: 'Cita mÃ©dica',
      });
    expect(timeOffResponse.status).toBe(201);
    const timeOffId = timeOffResponse.body.timeOff.id as string;

    const availabilityWithTimeOff = await request(app)
      .get(`/api/availability?serviceId=${serviceId}&staffId=${staffId}&date=${date}`)
      .set(auth(clientToken));
    expect(availabilityWithTimeOff.status).toBe(200);
    const blockedTimes = availabilityWithTimeOff.body.availability.slots.map(
      (slot: { startAt: string }) => new Date(slot.startAt).toISOString(),
    );
    expect(blockedTimes).not.toContain(localDateTime(date, '15:00').toISOString());
    expect(blockedTimes).toContain(localDateTime(date, '16:00').toISOString());

    const deleteTimeOff = await request(app)
      .delete(`/api/staff/${staffId}/time-off/${timeOffId}`)
      .set(auth(adminToken));
    expect(deleteTimeOff.status).toBe(204);

    const availabilityAfterDelete = await request(app)
      .get(`/api/availability?serviceId=${serviceId}&staffId=${staffId}&date=${date}`)
      .set(auth(clientToken));
    const openTimes = availabilityAfterDelete.body.availability.slots.map(
      (slot: { startAt: string }) => new Date(slot.startAt).toISOString(),
    );
    expect(openTimes).toContain(localDateTime(date, '15:00').toISOString());
  });

  it('returns the staff schedule and rejects overlapping time off', async () => {
    await createUser({
      email: 'admin2@test.local',
      password: 'AdminPassword123!',
      fullName: 'Test Admin 2',
      role: 'ADMIN',
    });
    const adminToken = await login('admin2@test.local', 'AdminPassword123!');

    const serviceResponse = await request(app)
      .post('/api/services')
      .set(auth(adminToken))
      .send({ name: 'Servicio horario', durationMinutes: 30, priceCents: 5_000 });
    const serviceId = serviceResponse.body.service.id as string;

    const staffResponse = await request(app)
      .post('/api/staff')
      .set(auth(adminToken))
      .send({
        email: 'staff2@test.local',
        password: 'StaffPassword123!',
        fullName: 'Test Staff 2',
        serviceIds: [serviceId],
      });
    const staffId = staffResponse.body.staff.id as string;

    const putHours = await request(app)
      .put(`/api/staff/${staffId}/working-hours`)
      .set(auth(adminToken))
      .send({
        hours: [
          { weekday: 1, startMinute: 9 * 60, endMinute: 13 * 60 },
          { weekday: 1, startMinute: 14 * 60, endMinute: 18 * 60 },
        ],
      });
    expect(putHours.status).toBe(200);

    const getHours = await request(app)
      .get(`/api/staff/${staffId}/working-hours`)
      .set(auth(adminToken));
    expect(getHours.status).toBe(200);
    expect(getHours.body.hours).toHaveLength(2);

    const date = localDate(7);
    const firstTimeOff = await request(app)
      .post(`/api/staff/${staffId}/time-off`)
      .set(auth(adminToken))
      .send({
        startAt: localDateTime(date, '10:00').toISOString(),
        endAt: localDateTime(date, '11:00').toISOString(),
      });
    expect(firstTimeOff.status).toBe(201);

    const overlapping = await request(app)
      .post(`/api/staff/${staffId}/time-off`)
      .set(auth(adminToken))
      .send({
        startAt: localDateTime(date, '10:30').toISOString(),
        endAt: localDateTime(date, '11:30').toISOString(),
      });
    expect(overlapping.status).toBe(409);
    expect(overlapping.body.error.code).toBe('TIME_OFF_OVERLAP');
  });
});
