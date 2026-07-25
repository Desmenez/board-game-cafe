/** Compute Traffic Die placement targets, nearest to current first. */
export function trafficDieTargets(
  fromIndex: number,
  rolls: readonly number[],
  approachLength: number,
): number[] {
  if (approachLength <= 0 || rolls.length === 0) return [];
  const lastIndex = approachLength - 1;
  return rolls
    .map((roll) => Math.min(fromIndex + Math.max(1, roll) - 1, lastIndex))
    .sort((a, b) => a - fromIndex - (b - fromIndex) || a - b);
}

export function rollsKey(rolls: readonly number[]): string {
  return rolls.join(',');
}
