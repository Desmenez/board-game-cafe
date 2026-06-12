import type { CamelUpColor } from 'shared';

export const CAMEL_COLOR_LABEL: Record<CamelUpColor, string> = {
  blue: 'น้ำเงิน',
  green: 'เขียว',
  yellow: 'เหลือง',
  orange: 'ส้ม',
  white: 'ขาว',
};

export function camelColorClass(color: CamelUpColor): string {
  return `camel-up-camel--${color}`;
}
