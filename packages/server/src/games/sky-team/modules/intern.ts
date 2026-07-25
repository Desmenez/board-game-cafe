import type {
  SkyTeamInternState,
  SkyTeamInternToken,
  SkyTeamPlacedDie,
  SkyTeamRole,
  SkyTeamSlotId,
  SkyTeamState,
} from 'shared';
import { SKY_TEAM_SLOT_DEFS } from 'shared';
import { appendLog } from '../helpers.js';
import type { SkyTeamModuleDefinition } from './types.js';

const TOKEN_VALUES = [1, 2, 3, 4, 5, 6] as const;

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

/** Six face-up tokens shuffled onto fixed board wells (left → right). */
export function createInternWells(): Array<SkyTeamInternToken | null> {
  const tokens: SkyTeamInternToken[] = TOKEN_VALUES.map((value, i) => ({
    id: `intern-${value}-${i}`,
    value,
  }));
  shuffleInPlace(tokens);
  return tokens;
}

export function remainingInternCount(wells: Array<SkyTeamInternToken | null>): number {
  return wells.filter(Boolean).length;
}

/** Closest remaining well index from Pilot (left) or Co-Pilot (right). */
export function closestInternIndex(
  wells: Array<SkyTeamInternToken | null>,
  role: SkyTeamRole,
): number {
  if (role === 'pilot') {
    for (let i = 0; i < wells.length; i++) {
      if (wells[i]) return i;
    }
  } else {
    for (let i = wells.length - 1; i >= 0; i--) {
      if (wells[i]) return i;
    }
  }
  return -1;
}

export function closestInternToken(
  wells: Array<SkyTeamInternToken | null>,
  role: SkyTeamRole,
): SkyTeamInternToken | undefined {
  const i = closestInternIndex(wells, role);
  return i < 0 ? undefined : (wells[i] ?? undefined);
}

export function takeClosestInternToken(
  wells: Array<SkyTeamInternToken | null>,
  role: SkyTeamRole,
): SkyTeamInternToken | undefined {
  const i = closestInternIndex(wells, role);
  if (i < 0) return undefined;
  const token = wells[i]!;
  wells[i] = null;
  return token;
}

export function isInternSlot(slotId: SkyTeamSlotId): boolean {
  return slotId === 'intern_pilot' || slotId === 'intern_copilot';
}

export function isConcentrationSlot(slotId: SkyTeamSlotId): boolean {
  return SKY_TEAM_SLOT_DEFS[slotId].section === 'concentration';
}

export function applyInternDiePlacement(state: SkyTeamState, placement: SkyTeamPlacedDie): void {
  if (!isInternSlot(placement.slotId)) return;
  const intern = state.moduleState.intern;
  if (!intern) return;

  const role: SkyTeamRole = placement.slotId === 'intern_pilot' ? 'pilot' : 'copilot';
  const next = closestInternToken(intern.wells, role);
  if (!next) {
    throw new Error('ไม่มี Intern token เหลือแล้ว');
  }
  if (next.value === placement.value) {
    throw new Error(`ลูกเต๋าต้องไม่เท่ากับ Intern token ถัดไป (token = ${next.value})`);
  }

  const taken = takeClosestInternToken(intern.wells, role);
  if (!taken) throw new Error('ไม่มี Intern token เหลือแล้ว');

  intern.pendingToken = {
    ownerId: placement.ownerId,
    tokenId: taken.id,
    value: taken.value,
  };

  appendLog(
    state,
    `Intern: ${role === 'pilot' ? 'Pilot' : 'Co-Pilot'} ฝึก — ได้ token ${taken.value} (เหลือ ${remainingInternCount(intern.wells)})`,
  );
}

export function clearPendingIntern(state: SkyTeamState): void {
  const intern = state.moduleState.intern;
  if (!intern) return;
  intern.pendingToken = undefined;
}

export function applyInternFinalLanding(state: SkyTeamState): string | null {
  const intern = state.moduleState.intern;
  if (!intern) return null;
  const left = remainingInternCount(intern.wells);
  if (left > 0) {
    return `ยังฝึก Intern ไม่ครบ (เหลือ ${left} token) — แพ้`;
  }
  if (intern.pendingToken) {
    return 'ยังมี Intern token ที่ยังไม่ได้วาง — แพ้';
  }
  return null;
}

export const internModule: SkyTeamModuleDefinition<SkyTeamInternState> = {
  id: 'intern',
  setup: () => ({
    wells: createInternWells(),
  }),
  onDiePlaced: (state, placement) => {
    applyInternDiePlacement(state, placement);
    return state;
  },
  validateFinalLanding: (state) => applyInternFinalLanding(state),
};
