import type { CSSProperties } from 'react';
import type { ChipDef } from 'shared';

/** Shared inline media style for every surface that renders a name chip. */
export function chipBackgroundStyle(chip: ChipDef | undefined): CSSProperties | undefined {
  if (!chip?.imageUrl) return undefined;
  return {
    backgroundImage: `linear-gradient(rgb(7 10 18 / 28%), rgb(7 10 18 / 28%)), url("${chip.imageUrl}")`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  };
}
