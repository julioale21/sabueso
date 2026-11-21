// The tree in SVG and the leftmost derivation, in sync (SPEC 03, step 8).
import type { DerivationStep, ParseTree } from '@sabueso/core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createLocalAnalysisService } from '../src/analysis/local-service';
import { TreeAndDerivation } from '../src/components/derivation-view/TreeAndDerivation';

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
