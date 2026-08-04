import type { AchievementStats, PlayerAvatarConfig, PlayerAvatarDisplay } from 'shared';
import {
  NO_TITLE_ID,
  TITLES,
  achievementForNameplateReward,
  achievementForTitleReward,
  canEquipNameplate,
  canEquipTitle,
  effectiveUnlockedAchievementIds,
  nameplateSections,
} from 'shared';
import { Lock } from 'lucide-react';
import { PlayerNameplate } from '../player-avatar';
import { CosmeticsLobbyPreview } from './CosmeticsLobbyPreview';

export interface CosmeticsPickerProps {
  titleId: string;
  nameplateId: string;
  onTitleChange: (titleId: string) => void;
  onNameplateChange: (nameplateId: string) => void;
  unlockedAchievements: ReadonlySet<string>;
  matchStats: AchievementStats;
  /** Live preview name shown above the pickers. */
  previewName: string;
  previewPlayerId: string;
  previewAvatar?: PlayerAvatarConfig | null;
  previewAvatarUrl?: string | null;
  previewAvatarDisplay?: PlayerAvatarDisplay | null;
}

/**
 * Title + nameplate inventory picker (used inside the profile cosmetics modal).
 */
export function CosmeticsPicker({
  titleId,
  nameplateId,
  onTitleChange,
  onNameplateChange,
  unlockedAchievements,
  matchStats,
  previewName,
  previewPlayerId,
  previewAvatar,
  previewAvatarUrl,
  previewAvatarDisplay,
}: CosmeticsPickerProps) {
  const unlocked = effectiveUnlockedAchievementIds(unlockedAchievements, matchStats);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-sm font-bold text-ink">พรีวิวในล็อบบี้</p>
        <CosmeticsLobbyPreview
          playerId={previewPlayerId}
          name={previewName}
          avatar={previewAvatar}
          avatarUrl={previewAvatarUrl}
          avatarDisplay={previewAvatarDisplay}
          nameplateId={nameplateId}
          titleId={titleId}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-ink">ฉายา</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onTitleChange(NO_TITLE_ID)}
            className={`flex min-h-12 flex-col gap-0.5 rounded-card border px-3 py-2.5 text-left transition ${
              titleId === NO_TITLE_ID
                ? 'border-pear bg-pear/15'
                : 'border-rule bg-paper hover:border-pear/60'
            }`}
            aria-pressed={titleId === NO_TITLE_ID}
          >
            <span className="text-sm font-bold text-ink">ไม่มีฉายา</span>
            <span className="text-xs text-ink-2">ไม่แสดงฉายาเหนือชื่อ</span>
          </button>
          {TITLES.map((titleDef) => {
            const isUnlocked = canEquipTitle(titleDef.id, unlocked);
            const selected = titleId === titleDef.id;
            const gate = achievementForTitleReward(titleDef.id);
            return (
              <button
                key={titleDef.id}
                type="button"
                disabled={!isUnlocked}
                onClick={() => onTitleChange(titleDef.id)}
                className={`flex min-h-12 flex-col gap-0.5 rounded-card border px-3 py-2.5 text-left transition ${
                  selected
                    ? 'border-pear bg-pear/15'
                    : isUnlocked
                      ? 'border-rule bg-paper hover:border-pear/60'
                      : 'cursor-not-allowed border-rule/50 bg-paper/40 opacity-60'
                }`}
                aria-pressed={selected}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-ink">{titleDef.label}</span>
                  {!isUnlocked ? <Lock size={14} className="shrink-0 text-ink-2" /> : null}
                </span>
                <span className="text-xs leading-5 text-ink-2">
                  {isUnlocked ? titleDef.description : (gate?.description ?? 'ยังไม่ปลดล็อก')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {nameplateSections().map((section) => {
        const wins =
          section.gameId != null ? (matchStats.winsByGame?.[section.gameId] ?? 0) : matchStats.wins;
        return (
          <div key={section.key}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="m-0 font-display text-base font-extrabold text-ink">
                {section.label}
              </h3>
              <span className="text-xs text-ink-2">
                {section.gameId
                  ? `ชนะ ${section.label} แล้ว ${wins} ครั้ง`
                  : `ชนะรวมทุกเกม ${wins} ครั้ง`}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {section.plates.map((plate) => {
                const isUnlocked = canEquipNameplate(plate.id, unlocked);
                const selected = nameplateId === plate.id;
                const gate = achievementForNameplateReward(plate.id);
                return (
                  <button
                    key={plate.id}
                    type="button"
                    disabled={!isUnlocked}
                    onClick={() => onNameplateChange(plate.id)}
                    className={`flex min-h-14 flex-col gap-1 rounded-card border px-3 py-2.5 text-left transition ${
                      selected
                        ? 'border-pear bg-pear/15'
                        : isUnlocked
                          ? 'border-rule bg-paper hover:border-pear/60'
                          : 'cursor-not-allowed border-rule/50 bg-paper/40 opacity-60'
                    }`}
                    aria-pressed={selected}
                    aria-label={
                      isUnlocked
                        ? `เลือกพื้นหลัง ${plate.label}`
                        : `ล็อก ${plate.label}${gate ? ` — ${gate.description}` : ''}`
                    }
                  >
                    <span className="relative block w-full">
                      <PlayerNameplate
                        name={plate.label}
                        nameplateId={plate.id}
                        layout="tile"
                        className={!isUnlocked ? 'pr-8' : undefined}
                        nameClassName="text-xs font-bold"
                      />
                      {!isUnlocked ? (
                        <Lock
                          size={14}
                          className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-ink-2 drop-shadow"
                          aria-hidden
                        />
                      ) : null}
                    </span>
                    <span className="text-xs leading-5 text-ink-2">
                      {isUnlocked ? plate.description : (gate?.description ?? 'ยังไม่ปลดล็อก')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
