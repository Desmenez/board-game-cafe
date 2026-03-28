/** Join class names; skip false / undefined / empty. */
export function cn(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(' ');
}
