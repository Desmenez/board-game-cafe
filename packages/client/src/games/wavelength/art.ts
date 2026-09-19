import type { WavelengthPhase, WavelengthTeam } from 'shared';
import { imageMap } from '../../imageMap';

const wl = imageMap.wavelength;

export function wavelengthDeviceSrc(): string {
  return wl.device;
}

export function wavelengthCoverSrc(): string {
  return wl.cover;
}

export const WL_TEAM_LABEL: Record<WavelengthTeam, string> = {
  orange: 'ทีมส้ม',
  purple: 'ทีมม่วง',
};

export const WL_PHASE_LABEL: Record<WavelengthPhase, string> = {
  psychic_setup: 'Psychic ตั้งค่า',
  clue: 'ส่งคำใบ้',
  team_dial: 'หมุนเข็ม',
  left_right: 'ทายซ้าย / ขวา',
  reveal: 'เปิดจอ',
  game_over: 'เกมจบ',
};
