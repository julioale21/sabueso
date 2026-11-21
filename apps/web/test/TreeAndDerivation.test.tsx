// The tree in SVG and the leftmost derivation, in sync (SPEC 03, step 8).
import type { DerivationStep, ParseTree } from '@sabueso/core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createLocalAnalysisService } from '../src/analysis/local-service';
import { TreeAndDerivation } from '../src/components/derivation-view/TreeAndDerivation';
import { allNodes, layoutTree, visibleAtStep } from '../src/tree-layout/layout';

const service = createLocalAnalysisService();
const { grammars } = await service.grammars();
const alphabet = new Set(grammars[0]?.alphabet);

/** A1 with G1, from the core: one tree and its 18-step derivation. */
async function a1WithG1(): Promise<{ tree: ParseTree; derivation: DerivationStep[] }> {
  const result = await service.analyze('detective/g1', 'CRI SOS PIS INT REV');
  if (!result.accepted || result.trees[0] === undefined) {
    throw new Error('A1 should be accepted by G1');
  }
  return { tree: result.trees[0], derivation: result.derivation };
}

const highlighted = () =>
  [...document.querySelectorAll('[data-highlighted]')].map((node) => node.textContent);

describe('TreeAndDerivation', () => {
  it('draws the tree in SVG: the 5 tags and the 6 collapsed ε nodes', async () => {
    render(<TreeAndDerivation {...await a1WithG1()} alphabet={alphabet} collapseEpsilon />);
    const svg = screen.getByRole('img', { name: 'Árbol de derivación' });
    for (const tag of ['CRI', 'SOS', 'PIS', 'INT', 'REV']) {
      expect(within(svg).getByText(tag)).toBeInTheDocument();
    }
    expect(within(svg).getAllByText('⇒ ε')).toHaveLength(6);
  });

  it('lists the 18 steps of the derivation, from Relato to the story', async () => {
    render(<TreeAndDerivation {...await a1WithG1()} alphabet={alphabet} collapseEpsilon />);
    expect(screen.getByText('Derivación más a la izquierda (18 pasos)')).toBeInTheDocument();
    const steps = within(
      screen.getByRole('list', { name: 'Derivación más a la izquierda' }),
    ).getAllByRole('button');
    expect(steps).toHaveLength(19);
    expect(steps[0]).toHaveTextContent('Relato');
    expect(steps[18]).toHaveTextContent('CRI SOS PIS INT REV');
  });

  it('selecting step 7 highlights the node Pasos in the tree', async () => {
    render(<TreeAndDerivation {...await a1WithG1()} alphabet={alphabet} collapseEpsilon />);
    expect(highlighted()).toEqual([]);
    const steps = within(
      screen.getByRole('list', { name: 'Derivación más a la izquierda' }),
    ).getAllByRole('button');
    fireEvent.click(steps[7] as HTMLElement);
    expect(highlighted()).toEqual(['Pasos']);
    expect(steps[7]).toHaveAttribute('aria-current', 'true');
  });

  it('a step inside a collapsed ε subtree highlights the collapsed node', async () => {
    render(<TreeAndDerivation {...await a1WithG1()} alphabet={alphabet} collapseEpsilon />);
    const steps = within(
      screen.getByRole('list', { name: 'Derivación más a la izquierda' }),
    ).getAllByRole('button');
    fireEvent.click(steps[18] as HTMLElement);
    expect(highlighted()).toEqual(['EpiOpc⇒ ε']);
  });
});

describe('the tree that builds itself with the derivation (step 18)', () => {
  const drawnNodes = () =>
    [...document.querySelectorAll('[data-node]')].map((node) => node.getAttribute('data-node'));
  const steps = () =>
    within(screen.getByRole('list', { name: 'Derivación más a la izquierda' })).getAllByRole(
      'button',
    );

  it('at step k it draws the root and the children of expansions 0 … k − 1', async () => {
    const { tree } = await a1WithG1();
    const root = layoutTree({ tree, collapseEpsilon: false }).root;
    expect([...visibleAtStep({ root, step: 0 })]).toEqual(['0']);
    // Step 1 expands Relato: its three children appear.
    expect([...visibleAtStep({ root, step: 1 })]).toEqual(['0', '0.0', '0.1', '0.2']);
    // Step 2 expands Planteo, the leftmost nonterminal: preorder.
    expect(visibleAtStep({ root, step: 2 }).has('0.0.0')).toBe(true);
    expect(visibleAtStep({ root, step: 2 }).has('0.1.0')).toBe(false);
    const last = allNodes(root).filter((node) => node.kind === 'nonterminal').length;
    expect(visibleAtStep({ root, step: last }).size).toBe(allNodes(root).length);
  });

  it('choosing a step draws the tree only up to that step', async () => {
    render(<TreeAndDerivation {...await a1WithG1()} alphabet={alphabet} collapseEpsilon />);
    fireEvent.click(steps()[1] as HTMLElement);
    expect(drawnNodes()).toEqual(['0', '0.0', '0.1', '0.2']);
    expect(screen.getByText('paso 1/18')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver completo' }));
    expect(screen.getByText('paso 18/18')).toBeInTheDocument();
    expect(highlighted()).toEqual([]);
  });

  it('with motion allowed and autoplay, a short derivation starts at step 0 and plays', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }));
    try {
      render(
        <TreeAndDerivation {...await a1WithG1()} alphabet={alphabet} collapseEpsilon autoplay />,
      );
      expect(screen.getByText('paso 0/18')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pausa/ })).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('without autoplay, or when the system asks for less motion, the tree appears whole', async () => {
    render(
      <TreeAndDerivation {...await a1WithG1()} alphabet={alphabet} collapseEpsilon autoplay />,
    );
    // jsdom has no matchMedia: treated as "less motion".
    expect(screen.getByText('paso 18/18')).toBeInTheDocument();
  });
});
