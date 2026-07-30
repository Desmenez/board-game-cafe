import type { TtrRouteColor, TtrTrainColor } from 'shared';

export const TTR_TRAIN_COLOR_LABEL: Record<TtrTrainColor, string> = {
  red: 'แดง',
  blue: 'น้ำเงิน',
  green: 'เขียว',
  yellow: 'เหลือง',
  black: 'ดำ',
  white: 'ขาว',
  orange: 'ส้ม',
  purple: 'ม่วง',
  locomotive: 'หัวรถจักร',
};

export const TTR_ROUTE_COLOR_LABEL: Record<TtrRouteColor, string> = {
  ...TTR_TRAIN_COLOR_LABEL,
  gray: 'สีเทา (ใช้สีใดก็ได้)',
};

export function ttrSeatClass(seat: number): string {
  return `ttr-owner-seat-${seat % 6}`;
}
