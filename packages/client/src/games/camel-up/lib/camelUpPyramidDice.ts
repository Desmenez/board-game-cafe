import { CAMEL_UP_COLORS, type CamelUpColor, type CamelUpPyramidDie } from 'shared';

export function sortPyramidDiceByColor(dice: readonly CamelUpPyramidDie[]): CamelUpPyramidDie[] {
  const byColor = new Map(dice.map((die) => [die.color, die]));
  return CAMEL_UP_COLORS.filter((color) => byColor.has(color)).map((color) => byColor.get(color)!);
}

export function pyramidDieByColor(
  dice: readonly CamelUpPyramidDie[],
): Partial<Record<CamelUpColor, CamelUpPyramidDie>> {
  return Object.fromEntries(dice.map((die) => [die.color, die])) as Partial<
    Record<CamelUpColor, CamelUpPyramidDie>
  >;
}

export function mergeLegPyramidDice(
  inBag: readonly CamelUpPyramidDie[],
  rolled: readonly CamelUpPyramidDie[],
): CamelUpPyramidDie[] {
  return sortPyramidDiceByColor([...inBag, ...rolled]);
}
