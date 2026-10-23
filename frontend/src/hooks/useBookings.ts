import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Booking, BookingPage } from '../types/api';

export function useMyBookings() {
  return useQuery({
    queryKey: ['bookings', 'me'],
    queryFn: async () => {
      const response = await api.get<BookingPage>('/bookings/me', { params: { limit: 50 } });
      return response.data;
    },
  });
}

export interface BookingFilters {
  staffId?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export function useBookings(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: ['bookings', 'admin', filters],
    queryFn: async () => {
      const response = await api.get<BookingPage>('/bookings', {
        params: {
          ...(filters.staffId ? { staffId: filters.staffId } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.from ? { from: filters.from } : {}),
          ...(filters.to ? { to: filters.to } : {}),
          limit: filters.limit ?? 50,
        },
      });
      return response.data;
    },
  });
}

export function useAgenda(from: string, to: string, staffId?: string) {
  return useQuery({
    queryKey: ['agenda', from, to, staffId],
    queryFn: async () => {
      const response = await api.get<{ data: Booking[] }>('/agenda', {
        params: {
          from,
          to,
          ...(staffId ? { staffId } : {}),
        },
      });
      return response.data.data;
    },
    enabled: Boolean(from && to),
  });
}
