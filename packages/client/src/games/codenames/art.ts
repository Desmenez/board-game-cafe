import type {
  CodenamesCardRole,
  CodenamesRole,
  CodenamesTeam,
  CodenamesTurnStage,
} from 'shared';
import { imageMap } from '../../imageMap';

export const CN_TEAM_LABEL: Record<CodenamesTeam, string> = {
  red: 'แดง',
  blue: 'ฟ้า',
};

export const CN_ROLE_LABEL: Record<CodenamesRole, string> = {
  spymaster: 'หัวหน้าทีม',
  operative: 'ลูกทีม',
};

export const CN_ROLE_TITLE: Record<CodenamesRole, string> = {
  spymaster: 'หัวหน้าทีม (Spymaster)',
  operative: 'ลูกทีม (Operative)',
};

export const CN_STAGE_LABEL: Record<CodenamesTurnStage, string> = {
  clue: 'Spymaster ให้คำใบ้',
  guess: 'ลูกทีมเดาคำบนกระดาน',
};

export const CN_CARD_ROLE_LABEL: Record<CodenamesCardRole, string> = {
  red: 'ทีมแดง',
  blue: 'ทีมฟ้า',
  neutral: 'ผู้บริสุทธิ์',
  assassin: 'มือสังหาร',
};

export function cnTeamName(team: CodenamesTeam): string {
  return `ทีม${CN_TEAM_LABEL[team]}`;
}

export function cnTeamRoleCardSrc(team: CodenamesTeam): string {
  return team === 'red'
    ? imageMap.codenames.roleCards.redTeam
    : imageMap.codenames.roleCards.blueTeam;
}
