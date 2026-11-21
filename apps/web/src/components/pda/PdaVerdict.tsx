/** Accept, reject or undetermined, and how many configurations the search explored. */
import type { PushdownRun } from '@sabueso/core';

const MESSAGES: Record<PushdownRun['result'], string> = {
  accept: '✓ Aceptado: la pila queda vacía después de leer todo el relato',
  reject: '✗ Rechazado: ninguna rama vacía la pila al final del relato',
  undetermined: '? Indeterminado: la búsqueda llegó a su límite de configuraciones',
};

export function PdaVerdict({ run }: { run: PushdownRun }) {
  return (
    <p role="status" className="text-sm font-medium">
      {MESSAGES[run.result]} · {run.steps} configuraciones exploradas.
    </p>
  );
}
