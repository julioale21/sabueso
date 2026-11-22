/** LL(1) ✓ ⇒ no ambigua, or how many conflicts: the conclusion of the table (guide 12). */
import { Badge } from '../ui/Badge';

export function Ll1Verdict({ conflicts }: { conflicts: number }) {
  return conflicts === 0 ? (
    <p className="flex items-center gap-2 text-sm">
      <Badge tone="success">LL(1) ✓</Badge>
      La tabla no tiene conflictos: la gramática es LL(1) y, por lo tanto, no es ambigua.
    </p>
  ) : (
    <p className="flex items-center gap-2 text-sm">
      <Badge tone="danger">{conflicts} conflictos</Badge>
      Hay celdas con más de una producción: mirar un solo símbolo no alcanza para elegir. No es
      LL(1).
    </p>
  );
}
