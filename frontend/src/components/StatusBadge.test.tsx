import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders the Spanish label for a pending booking', () => {
    render(<StatusBadge status="PENDING" />);

    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('renders the Spanish label for a confirmed booking', () => {
    render(<StatusBadge status="CONFIRMED" />);

    expect(screen.getByText('Confirmada')).toBeInTheDocument();
  });
});
