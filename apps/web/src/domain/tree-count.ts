/** How the total number of trees is written on screen (SPEC 03, section 3.4). */
import type { TreeCount } from '@sabueso/core';

const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** 114 → '¹¹⁴'. */
function superscript(value: number): string {
  return [...String(value)].map((digit) => SUPERSCRIPTS[Number(digit)] ?? digit).join('');
}

/**
 * Up to 15 digits, the whole number; beyond that, an approximation with the number of digits,
 * because C(197) does not fit on screen: '≈ 5,0 × 10¹¹⁴ (115 dígitos)'.
 */
export function formatTreeCount(count: TreeCount): string {
  if (count === 'infinite') {
    return 'infinitos';
  }
  const digits = String(count);
  if (digits.length <= 15) {
    return digits;
  }
  const mantissa = `${digits[0] ?? ''},${digits[1] ?? '0'}`;
  return `≈ ${mantissa} × 10${superscript(digits.length - 1)} (${digits.length} dígitos)`;
}

/** 1 → 'árbol', anything else → 'árboles'. */
export function treesWord(count: TreeCount): string {
  return count === 1n ? 'árbol' : 'árboles';
}
