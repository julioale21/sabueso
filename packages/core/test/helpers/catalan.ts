// The Catalan numbers, only to check the counts of G0 in the tests: with Pasos → Pasos Pasos,
// n steps can be grouped in C(n − 1) ways, so L1 (198 steps) must have C(197) trees.

/** C(n) = (2n)! / ((n + 1)! n!), exact with bigint: 1, 1, 2, 5, 14, 42, … */
export function catalan(n: number): bigint {
  // C(k + 1) = C(k) × 2(2k + 1) / (k + 2): every intermediate result is a whole number,
  // so the bigint division is exact.
  let value = 1n;
  for (let k = 0; k < n; k++) {
    value = (value * 2n * BigInt(2 * k + 1)) / BigInt(k + 2);
  }
  return value;
}
