import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Availability, Service, StaffMember } from '../types/api';

export function useServices(includeInactive = false) {
  return useQuery({
    queryKey: ['services', includeInactive],
    queryFn: async () => {
      const response = await api.get<{ data: Service[] }>('/services', {
        params: includeInactive ? { includeInactive: 'true' } : undefined,
      });
      return response.data.data;
    },
  });
}

export function useStaffList(options: { serviceId?: string; includeInactive?: boolean } = {}) {
  return useQuery({
    queryKey: ['staff', options],
    queryFn: async () => {
      const response = await api.get<{ data: StaffMember[] }>('/staff', {
        params: {
          ...(options.serviceId ? { serviceId: options.serviceId } : {}),
          ...(options.includeInactive ? { includeInactive: 'true' } : {}),
        },
      });
      return response.data.data;
    },
  });
}

export function useStaffMember(staffId: string | undefined) {
  return useQuery({
    queryKey: ['staff', staffId],
    enabled: Boolean(staffId),
    queryFn: async () => {
      const response = await api.get<{ staff: StaffMember }>(`/staff/${staffId}`);
      return response.data.staff;
    },
  });
}

export function useAvailability(serviceId: string | null, staffId: string | null, date: string) {
  return useQuery({
    queryKey: ['availability', serviceId, staffId, date],
    enabled: Boolean(serviceId && staffId && date),
    queryFn: async () => {
      const response = await api.get<{ availability: Availability }>('/availability', {
        params: { serviceId, staffId, date },
      });
      return response.data.availability;
    },
    staleTime: 15_000,
  });
}

export function useWorkingHours(staffId: string | undefined) {
  return useQuery({
    queryKey: ['working-hours', staffId],
    enabled: Boolean(staffId),
    queryFn: async () => {
      const response = await api.get<{
        hours: Array<{ weekday: number; startMinute: number; endMinute: number }>;
      }>(`/staff/${staffId}/working-hours`);
      return response.data.hours;
    },
  });
}

export function useTimeOff(staffId: string | undefined) {
  return useQuery({
    queryKey: ['time-off', staffId],
    enabled: Boolean(staffId),
    queryFn: async () => {
      const response = await api.get<{
        data: Array<{
          id: string;
          staffId: string;
          startAt: string;
          endAt: string;
          reason: string | null;
          createdAt: string;
        }>;
      }>(`/staff/${staffId}/time-off`);
      return response.data.data;
    },
  });
}
