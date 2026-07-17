import type { OnuwNightStepKind, OnuwPlayerView, OnuwRole, OnuwTeam } from 'shared';
import { onuwOrderedCompositionSlots } from 'shared';

export const ROLE_LABEL_TH: Record<OnuwRole, string> = {
  werewolf: 'มนุษย์หมาป่า',
  doppelganger: 'Doppelgänger',
  minion: 'ลูกสมุน',
  mason: 'ช่างหิน',
  seer: 'หมอดู',
  robber: 'โจร',
  troublemaker: 'คนสร้างปัญหา',
  drunk: 'คนเมา',
  insomniac: 'คนนอนไม่หลับ',
  hunter: 'นักล่า',
  tanner: 'ทันเนอร์',
  villager: 'ชาวบ้าน',
};

export const ROLE_LABEL_EN: Record<OnuwRole, string> = {
  werewolf: 'Werewolf',
  doppelganger: 'Doppelgänger',
  minion: 'Minion',
  mason: 'Mason',
  seer: 'Seer',
  robber: 'Robber',
  troublemaker: 'Troublemaker',
  drunk: 'Drunk',
  insomniac: 'Insomniac',
  hunter: 'Hunter',
  tanner: 'Tanner',
  villager: 'Villager',
};

export const TEAM_LABEL_TH: Record<OnuwTeam, string> = {
  werewolf_team: 'ฝ่ายหมาป่า',
  village_team: 'ฝ่ายหมู่บ้าน',
};

export const NIGHT_KIND_TH: Record<OnuwNightStepKind, string> = {
  doppelganger: ROLE_LABEL_TH.doppelganger,
  werewolf: ROLE_LABEL_TH.werewolf,
  minion: ROLE_LABEL_TH.minion,
  mason: ROLE_LABEL_TH.mason,
  seer: ROLE_LABEL_TH.seer,
  robber: ROLE_LABEL_TH.robber,
  troublemaker: ROLE_LABEL_TH.troublemaker,
  drunk: ROLE_LABEL_TH.drunk,
  insomniac: ROLE_LABEL_TH.insomniac,
};

/** บทที่ไม่มีขั้นตื่นกลางคืนในกติกานี้ (กฎบท — ไม่ใช่ hint ว่าอยู่กลางหรือไม่) */
export const ONUW_ROLES_WITHOUT_NIGHT_ACTION: ReadonlySet<OnuwRole> = new Set([
  'villager',
  'hunter',
  'tanner',
]);

export function buildOrderedCompositionSlots(rolesInPlay: OnuwPlayerView['rolesInPlay']): {
  role: OnuwRole;
  artKey: string;
  label: string;
  slotKey: string;
}[] {
  return onuwOrderedCompositionSlots(rolesInPlay).map((s) => ({
    ...s,
    label: ROLE_LABEL_TH[s.role],
  }));
}

export function artKeyForNightScheduledRole(
  rolesInPlay: OnuwPlayerView['rolesInPlay'],
  kind: OnuwNightStepKind,
): string {
  const row = rolesInPlay.find((r) => r.role === kind);
  return row?.artKeys[0] ?? '';
}

export function teamTone(team: OnuwTeam): 'good' | 'evil' {
  return team === 'village_team' ? 'good' : 'evil';
}
