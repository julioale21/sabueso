/** How the CYK table is explained while it fills by length (guide 25). */

/** What step l of the filling does, in words: l = 0 is the empty table, l = n the top cell. */
export function stepText({ step, n }: { step: number; n: number }): string {
  if (step === 0) {
    return 'La tabla vacía: todavía no se llenó ningún largo.';
  }
  if (step === 1) {
    return 'Largo 1: cada etiqueta sola, con las producciones A → a.';
  }
  const done = step === n ? ' Es la celda de arriba: decide.' : '';
  return `Largo ${step}: cada pedazo de ${step} etiquetas, partido en dos con A → B C, usando las filas de abajo.${done}`;
}
