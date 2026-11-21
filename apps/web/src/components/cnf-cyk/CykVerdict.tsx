/** The CYK verdict: the start symbol in the top cell T[0][n], or S → ε for the empty story. */
export function CykVerdict({
  accepted,
  start,
  length,
}: {
  accepted: boolean;
  start: string;
  length: number;
}) {
  const where = length === 0 ? `${start} → ε en la FNC` : `${start} en T[0][${length}]`;
  return (
    <p role="status" className="text-sm font-medium">
      {accepted ? `✓ Aceptado: ${where}.` : `✗ Rechazado: no hay ${where}.`}
    </p>
  );
}
