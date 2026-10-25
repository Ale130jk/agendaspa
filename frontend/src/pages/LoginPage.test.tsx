import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../lib/auth-context';
import { LoginPage } from './LoginPage';

function renderLogin(overrides: Partial<AuthContextValue> = {}) {
  const login = vi.fn().mockResolvedValue({
    id: 'user-1',
    email: 'cliente@agendaspa.local',
    fullName: 'Camila Torres',
    phone: null,
    role: 'CLIENT',
    staffId: null,
  });

  const value: AuthContextValue = {
    user: null,
    status: 'anonymous',
    login,
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };

  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthContext.Provider value={value}>
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );

  return { login };
}

describe('LoginPage', () => {
  it('sends the typed credentials to login', async () => {
    const { login } = renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Correo'), 'cliente@agendaspa.local');
    await user.type(screen.getByLabelText('Contraseña'), 'Client123!');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith('cliente@agendaspa.local', 'Client123!'),
    );
  });
});
