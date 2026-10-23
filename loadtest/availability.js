import http from 'k6/http';
import { check, fail, sleep } from 'k6';

const baseUrl = (__ENV.BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const maxVus = Number(__ENV.K6_MAX_VUS ?? 10);

export const options = {
  scenarios: {
    availability_reads: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: maxVus },
        { duration: '30s', target: maxVus },
        { duration: '5s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    checks: ['rate>0.99'],
  },
};

function jsonHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
}

export function setup() {
  const email = __ENV.K6_EMAIL ?? 'cliente@agendaspa.local';
  const password = __ENV.K6_PASSWORD ?? 'Client123!';

  const loginResponse = http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({ email, password }),
    jsonHeaders(),
  );

  if (loginResponse.status !== 200) {
    fail(`Login failed with status ${loginResponse.status}: ${loginResponse.body}`);
  }

  const token = loginResponse.json('accessToken');
  const servicesResponse = http.get(`${baseUrl}/api/services`, jsonHeaders());

  if (servicesResponse.status !== 200) {
    fail(`Services request failed with status ${servicesResponse.status}`);
  }

  const service = servicesResponse.json('data.0');
  if (!service) {
    fail('No services returned. Run the demo seed first.');
  }

  const staffResponse = http.get(
    `${baseUrl}/api/staff?serviceId=${service.id}`,
    jsonHeaders(token),
  );

  if (staffResponse.status !== 200) {
    fail(`Staff request failed with status ${staffResponse.status}`);
  }

  const staff = staffResponse.json('data.0');
  if (!staff) {
    fail('No staff returned for the selected service. Run the demo seed first.');
  }

  const limaDate = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    token,
    serviceId: service.id,
    staffId: staff.id,
    date: limaDate,
  };
}

export default function (data) {
  const services = http.get(`${baseUrl}/api/services`, {
    tags: { endpoint: 'services' },
  });

  check(services, {
    'services status is 200': (response) => response.status === 200,
    'services body is a list': (response) => Array.isArray(response.json('data')),
  });

  const availability = http.get(
    `${baseUrl}/api/availability?serviceId=${data.serviceId}&staffId=${data.staffId}&date=${data.date}`,
    {
      ...jsonHeaders(data.token),
      tags: { endpoint: 'availability' },
    },
  );

  check(availability, {
    'availability status is 200': (response) => response.status === 200,
    'availability has slots array': (response) =>
      Array.isArray(response.json('availability.slots')),
    'availability returns the spa timezone': (response) =>
      response.json('availability.timeZone') === 'America/Lima',
  });

  sleep(1);
}
