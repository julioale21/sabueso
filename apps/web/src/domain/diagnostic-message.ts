/**
 * The diagnosis of a rejected story in words (card 17): where the error is and what was
 * expected there. Positions count from 0, as in the core; events from 1, as a person does.
 */
import type { ParseError } from '@sabueso/core';

export function diagnosticMessage(error: ParseError): string {
  const expected =
    error.expected.length === 0
      ? 'el relato está incompleto'
      : `se esperaba: ${error.expected.join(', ')}`;
  switch (error.kind) {
    case 'unknown-symbol':
      return `Posición ${error.position} (evento ${error.position + 1}): ${error.found ?? ''} no es una etiqueta de este género.`;
    case 'unexpected-token':
      return `Posición ${error.position} (evento ${error.position + 1}): se encontró ${error.found ?? ''}; ${expected}.`;
    case 'unexpected-end':
      return `El relato termina antes de completarse (posición ${error.position}); ${expected}.`;
  }
}
