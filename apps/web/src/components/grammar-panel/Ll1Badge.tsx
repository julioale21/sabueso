/** LL(1) ✓ (so unambiguous) or LL(1) ✗ with its conflicts: the grammar at a glance (guide 12). */
import { Badge } from '../ui/Badge';

export function Ll1Badge({ conflicts }: { conflicts: number }) {
  return conflicts === 0 ? (
    <Badge
      tone="success"
      title="La tabla predictiva no tiene conflictos: la gramática no es ambigua"
    >
      LL(1) ✓
    </Badge>
  ) : (
    <Badge tone="danger" title="La tabla predictiva tiene conflictos: no es LL(1)">
      LL(1) ✗ · {conflicts} conflictos
    </Badge>
  );
}
