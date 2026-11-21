/** 'CRI  PIS\nREV' → ['CRI', 'PIS', 'REV']: any run of spaces or line breaks separates two tags. */
export function splitTags(input: string): string[] {
  return input.split(/\s+/).filter((word) => word !== '');
}
