import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App';

describe('App', () => {
  it('shows the title and the core version', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Sabueso' })).toBeInTheDocument();
    expect(screen.getByText(/0\.1\.0/)).toBeInTheDocument();
  });
});
