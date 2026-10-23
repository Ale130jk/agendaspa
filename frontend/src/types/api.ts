export type Role = 'ADMIN' | 'STAFF' | 'CLIENT';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  staffId: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffService {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}

export interface StaffMember {
  id: string;
  fullName: string;
  email?: string;
  phone?: string | null;
  bio: string | null;
  isActive: boolean;
  services: StaffService[];
}

export interface AvailabilitySlot {
  startAt: string;
  endAt: string;
}

export interface Availability {
  staffId: string;
  serviceId: string;
  date: string;
  timeZone: string;
  slots: AvailabilitySlot[];
}

export interface Booking {
  id: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  expiresAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    priceCents: number;
  };
  staff: {
    id: string;
    fullName: string;
  };
  client: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface BookingPage {
  data: Booking[];
  nextCursor: string | null;
}

export interface WorkingHour {
  id?: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface TimeOff {
  id: string;
  staffId: string;
  startAt: string;
  endAt: string;
  reason: string | null;
  createdAt: string;
}

export interface HealthStatus {
  status: 'ok';
}

export interface ReadinessStatus {
  status: 'ready' | 'degraded' | 'not_ready';
  checks: {
    database: 'ok' | 'down';
    redis: 'ok' | 'degraded';
  };
}
