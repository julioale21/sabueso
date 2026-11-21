/**
 * Whether the system asks for less motion. Read once, when the component mounts. Without
 * matchMedia (tests, very old browsers) it answers yes: when in doubt, no animation.
 */
import { useState } from 'react';

export function usePrefersReducedMotion(): boolean {
  const [reduced] = useState(
    () =>
      typeof window.matchMedia !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  return reduced;
}
