import type { User } from '../types/api';

export function homeForRole(role: User['role']): string {
  if (role === 'ADMIN') {
    return '/admin';
  }
  if (role === 'STAFF') {
    return '/agenda';
  }
  return '/';
}
