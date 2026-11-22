/**
 * What the comparison up to k proves (guide 27): one sentence in a single language proves
 * L(G0) ≠ L(G1); none proves nothing, because equivalence is undecidable.
 */
export function ComparisonVerdict({
  first,
  second,
  differences,
  maxLength,
}: {
  first: string;
  second: string;
  differences: number;
  maxLength: number;
}) {
  return (
    <p role="status" className="text-sm font-medium">
      {differences > 0
        ? `L(${first}) ≠ L(${second}): alcanza un solo relato de las listas para demostrarlo.`
        : `Hasta largo ${maxLength} generan las mismas oraciones. No demuestra que L(${first}) = L(${second}): la equivalencia es indecidible.`}
    </p>
  );
}
