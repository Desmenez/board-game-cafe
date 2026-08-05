import { ICONS, NO_ICON_ID, normalizeIconId, unlockedIconIds } from 'shared';

const MAX_BADGE_ICONS = 5;

/** Pick unlocked icons for the Discord-style badge row (equipped first, max 5). */
export function pickBadgeIconIds(
  unlockedAchievementIds: ReadonlySet<string>,
  equippedIconId?: string | null,
  max = MAX_BADGE_ICONS,
): string[] {
  const unlocked = unlockedIconIds(unlockedAchievementIds);
  unlocked.delete(NO_ICON_ID);
  const equipped = normalizeIconId(equippedIconId);
  const ordered: string[] = [];
  if (equipped !== NO_ICON_ID && unlocked.has(equipped)) {
    ordered.push(equipped);
  }
  for (const def of ICONS) {
    if (ordered.length >= max) break;
    if (unlocked.has(def.id) && !ordered.includes(def.id)) {
      ordered.push(def.id);
    }
  }
  return ordered.slice(0, max);
}
