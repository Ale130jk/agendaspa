import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../lib/auth-context';
import { RegisterPage } from './RegisterPage';

function renderRegister(overrides: Partial<AuthContextValue> = {}) {
  const registerUser = vi.fn().mockResolvedValue({
    id: 'user-1',
    email: 'nueva@agendaspa.local',
    fullName: 'Nueva Cliente',
    phone: '999888777',
    role: 'CLIENT',
    staffId: null,
  });

  const value: AuthContextValue = {
    user: null,
    status: 'anonymous',
    login: vi.fn(),
    register: registerUser,
    logout: vi.fn(),
    ...overrides,
  };

  render(
    <MemoryRouter initialEntries={['/registro']}>
      <AuthContext.Provider value={value}>
        <RegisterPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );

  return { registerUser };
}

describe('RegisterPage', () => {
  it('sends the typed values to register', async () => {
    const { registerUser } = renderRegister();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Nombre completo'), 'Nueva Cliente');
    await user.type(screen.getByLabelText('Teléfono (opcional)'), '999888777');
    await user.type(screen.getByLabelText('Correo'), 'nueva@agendaspa.local');
    await user.type(screen.getByLabelText('Contraseña'), 'Client123!');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'Client123!');
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() =>
      expect(registerUser).toHaveBeenCalledWith({
        fullName: 'Nueva Cliente',
        email: 'nueva@agendaspa.local',
        phone: '999888777',
        password: 'Client123!',
      }),
    );
  });
});
