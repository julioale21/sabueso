import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App';

describe('the tabs of the page', () => {
  it('shows the six views, with Análisis selected first', () => {
    render(<App />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.firstChild?.textContent)).toEqual([
      'Análisis',
      'Earley paso a paso',
      'FNC y CYK',
      'Autómata de pila',
      'LL(1)',
      'G0 vs G1',
    ]);
    expect(screen.getByRole('tab', { name: 'Análisis' })).toHaveAttribute('aria-selected', 'true');
  });

  it('before analyzing, the tabs about the story are disabled and say why', () => {
    render(<App />);
    for (const name of ['Earley paso a paso', 'FNC y CYK', 'Autómata de pila']) {
      const tab = screen.getByRole('tab', { name });
      expect(tab).toBeDisabled();
      expect(tab).toHaveAttribute('title', 'Analiza un relato primero (pestaña Análisis)');
    }
    for (const name of ['LL(1)', 'G0 vs G1']) {
      expect(screen.getByRole('tab', { name })).toBeEnabled();
    }
  });

  it('the arrow keys, Home and End move between the enabled tabs, wrapping around', () => {
    render(<App />);
    const press = (key: string) => {
      fireEvent.keyDown(document.activeElement ?? document.body, { key });
    };
    screen.getByRole('tab', { name: 'Análisis' }).focus();
    press('ArrowRight');
    expect(screen.getByRole('tab', { name: 'LL(1)' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'tab-ll1');
    press('End');
    expect(screen.getByRole('tab', { name: 'G0 vs G1' })).toHaveFocus();
    press('ArrowRight');
    expect(screen.getByRole('tab', { name: 'Análisis' })).toHaveAttribute('aria-selected', 'true');
    press('ArrowLeft');
    expect(screen.getByRole('tab', { name: 'G0 vs G1' })).toHaveAttribute('aria-selected', 'true');
  });

  it('the arrows up and down also move, since the bar is vertical', () => {
    render(<App />);
    screen.getByRole('tab', { name: 'Análisis' }).focus();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'ArrowDown' });
    expect(screen.getByRole('tab', { name: 'LL(1)' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'ArrowUp' });
    expect(screen.getByRole('tab', { name: 'Análisis' })).toHaveAttribute('aria-selected', 'true');
  });

  it('on small screens, a bar with the current view opens the drawer, and choosing a view closes it', () => {
    render(<App />);
    const menu = screen.getByRole('button', { name: /Vista: Análisis/ });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'LL(1)' }));
    expect(screen.getByRole('button', { name: /Vista: LL\(1\)/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('the drawer also closes with ✕ and with Escape', () => {
    render(<App />);
    const menu = screen.getByRole('button', { name: /Vista: Análisis/ });
    fireEvent.click(menu);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar las vistas' }));
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(menu);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Análisis' }), { key: 'Escape' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
  });

  it('clicking a tab shows its panel', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'LL(1)' }));
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'tab-ll1');
  });
});
