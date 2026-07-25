import {
  SKY_TEAM_SLOT_DEFS,
  skyTeamHasModule,
  skyTeamSwitchAlreadyOn,
  type SkyTeamPlayerView,
  type SkyTeamSlotId,
} from 'shared';

/**
 * Client-side placement check for the selected die's effective value
 * (raw face + coffee delta). Server `slot.canPlace` only considers raw dice
 * in hand, so coffee-adjusted faces would otherwise never highlight/click.
 */
export function clientExplainCannotPlace(
  view: SkyTeamPlayerView,
  slotId: SkyTeamSlotId,
  value: number,
): string | null {
  if (view.phase !== 'dice_placement') return 'ไม่ได้อยู่ในช่วงวางลูกเต๋า';
  if (view.rerollPending) return 'กำลัง reroll อยู่';
  if (!view.isMyTurn) return 'ยังไม่ถึงเทิร์นคุณ';

  const slot = view.slots.find((s) => s.id === slotId);
  if (!slot) return 'ไม่พบช่อง';
  if (slot.occupied) return 'ช่องนี้มีลูกเต๋าแล้ว';
  if (skyTeamSwitchAlreadyOn(view.switches, slotId)) return 'สวิตช์เปิดอยู่แล้ว';

  const def = SKY_TEAM_SLOT_DEFS[slotId];
  if (!def) return 'ไม่พบช่อง';

  if (def.roles !== 'any' && !def.roles.includes(view.myRole)) {
    return view.myRole === 'pilot' ? 'ช่องนี้เป็นของ Co-Pilot' : 'ช่องนี้เป็นของ Pilot';
  }
  if (def.allowedValues !== 'any' && !def.allowedValues.includes(value)) {
    return `ช่องนี้รับค่า ${def.allowedValues.join(', ')} (ตอนนี้ ${value})`;
  }

  if (slotId === 'flaps_23' && !view.switches.flaps12) return 'ต้องปลด Flaps ตามลำดับ';
  if (slotId === 'flaps_34' && !view.switches.flaps23) return 'ต้องปลด Flaps ตามลำดับ';
  if (slotId === 'flaps_45' && !view.switches.flaps34) return 'ต้องปลด Flaps ตามลำดับ';

  if (slotId === 'brake_2' || slotId === 'brake_4' || slotId === 'brake_6') {
    if (skyTeamHasModule(view.enabledModules, 'ice-brakes')) {
      return 'ใช้ Ice Brakes แทนเบรกปกติ';
    }
  }
  if (slotId === 'brake_4' && !view.switches.brake2) return 'ต้องปลดเบรกตามลำดับ';
  if (slotId === 'brake_6' && !view.switches.brake4) return 'ต้องปลดเบรกตามลำดับ';

  return null;
}

export function clientCanPlaceSlot(
  view: SkyTeamPlayerView,
  slotId: SkyTeamSlotId,
  /** Effective face after coffee; null = fall back to server `canPlace`. */
  effectiveValue: number | null,
): boolean {
  if (effectiveValue == null) {
    return Boolean(view.slots.find((s) => s.id === slotId)?.canPlace);
  }
  return clientExplainCannotPlace(view, slotId, effectiveValue) == null;
}
