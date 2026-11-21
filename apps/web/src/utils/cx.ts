/** Joins class names, skipping the false, null and undefined ones: cx('a', isOn && 'b'). */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
