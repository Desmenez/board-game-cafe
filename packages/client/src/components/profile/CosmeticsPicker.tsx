import { useState } from 'react';
import type { AchievementStats, PlayerAvatarConfig, PlayerAvatarDisplay } from 'shared';
import {
  CHIPS,
  ICONS,
  NO_CHIP_ID,
  NO_ICON_ID,
  NO_TITLE_ID,
  TITLES,
  achievementForChipReward,
  achievementForIconReward,
  achievementForNameplateReward,
  achievementForTitleReward,
  canEquipChip,
  canEquipIcon,
  canEquipNameplate,
  canEquipTitle,
  effectiveUnlockedAchievementIds,
  nameplateSections,
} from 'shared';
import { Lock } from 'lucide-react';
import { cn } from '../../utils/cn';
import { PlayerNameplate } from '../player-avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui';
import { CosmeticsLobbyPreview } from './CosmeticsLobbyPreview';
import { CosmeticsPublicProfilePreview } from './CosmeticsPublicProfilePreview';

export interface CosmeticsPickerProps {
  titleId: string;
  iconId: string;
  chipId: string;
  nameplateId: string;
  onTitleChange: (titleId: string) => void;
  onIconChange: (iconId: string) => void;
  onChipChange: (chipId: string) => void;
  onNameplateChange: (nameplateId: string) => void;
  unlockedAchievements: ReadonlySet<string>;
  matchStats: AchievementStats;
  /** Live preview name shown above the pickers. */
  previewName: string;
  previewPlayerId: string;
  previewAvatar?: PlayerAvatarConfig | null;
  previewAvatarUrl?: string | null;
  previewAvatarDisplay?: PlayerAvatarDisplay | null;
  /** Friend code / handle without `@` — for public profile preview. */
  previewHandle?: string | null;
}

type CosmeticsCategory = 'title' | 'icon' | 'chip' | 'nameplate';

const CATEGORIES: readonly { id: CosmeticsCategory; label: string }[] = [
  { id: 'title', label: 'ฉายา' },
  { id: 'icon', label: 'ไอคอน' },
  { id: 'chip', label: 'ชิปชื่อ' },
  { id: 'nameplate', label: 'พื้นหลัง' },
];

const tileClass = (selected: boolean, isUnlocked: boolean) =>
  cn(
    'flex min-h-12 flex-col gap-0.5 rounded-card border px-3 py-2.5 text-left transition',
    selected
      ? 'border-pear bg-pear/15'
      : isUnlocked
        ? 'border-rule bg-paper hover:border-pear/60'
        : 'cursor-not-allowed border-rule/50 bg-paper/40 opacity-60',
  );

/**
 * Cosmetics inventory: sticky dual preview (lobby + public profile) + tabbed category options.
 */
export function CosmeticsPicker({
  titleId,
  iconId,
  chipId,
  nameplateId,
  onTitleChange,
  onIconChange,
  onChipChange,
  onNameplateChange,
  unlockedAchievements,
  matchStats,
  previewName,
  previewPlayerId,
  previewAvatar,
  previewAvatarUrl,
  previewAvatarDisplay,
  previewHandle,
}: CosmeticsPickerProps) {
  const [activeCategory, setActiveCategory] = useState<CosmeticsCategory>('title');
  const unlocked = effectiveUnlockedAchievementIds(unlockedAchievements, matchStats);
  const previewLabel = previewName.trim() || 'ชื่อของคุณ';

  return (
    <div className="flex flex-col gap-5 md:grid md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:items-start md:gap-5">
      <div className="flex flex-col gap-4 md:sticky md:top-0">
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
            iconId={iconId}
            chipId={chipId}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-ink">พรีวิวโปรไฟล์สาธารณะ</p>
          <CosmeticsPublicProfilePreview
            playerId={previewPlayerId}
            name={previewName}
            handle={previewHandle}
            avatar={previewAvatar}
            avatarUrl={previewAvatarUrl}
            avatarDisplay={previewAvatarDisplay}
            nameplateId={nameplateId}
            titleId={titleId}
            iconId={iconId}
            chipId={chipId}
            unlockedAchievements={unlocked}
          />
        </div>
      </div>

      <Tabs
        value={activeCategory}
        onValueChange={(value) => setActiveCategory(value as CosmeticsCategory)}
        className="min-w-0"
      >
        <TabsList aria-label="หมวดของตกแต่ง" className="ui-tabs-list--scroll">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="title" className="min-w-0">
          <p className="mb-2 text-sm font-bold text-ink">ฉายา</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onTitleChange(NO_TITLE_ID)}
              className={tileClass(titleId === NO_TITLE_ID, true)}
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
                  className={tileClass(selected, isUnlocked)}
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
        </TabsContent>

        <TabsContent value="icon" className="min-w-0">
          <p className="mb-2 text-sm font-bold text-ink">ไอคอน</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onIconChange(NO_ICON_ID)}
              className={tileClass(iconId === NO_ICON_ID, true)}
              aria-pressed={iconId === NO_ICON_ID}
            >
              <span className="text-sm font-bold text-ink">ไม่มีไอคอน</span>
              <span className="text-xs text-ink-2">ไม่แสดงเหรียญบน avatar</span>
            </button>
            {ICONS.map((iconDef) => {
              const isUnlocked = canEquipIcon(iconDef.id, unlocked);
              const selected = iconId === iconDef.id;
              const gate = achievementForIconReward(iconDef.id);
              return (
                <button
                  key={iconDef.id}
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => onIconChange(iconDef.id)}
                  className={tileClass(selected, isUnlocked)}
                  aria-pressed={selected}
                  aria-label={
                    isUnlocked
                      ? `เลือกไอคอน ${iconDef.label}`
                      : `ล็อก ${iconDef.label}${gate ? ` — ${gate.description}` : ''}`
                  }
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <img
                        src={iconDef.imageUrl}
                        alt=""
                        width={28}
                        height={28}
                        className="size-7 shrink-0 object-contain"
                        draggable={false}
                      />
                      <span className="text-sm font-bold text-ink">{iconDef.label}</span>
                    </span>
                    {!isUnlocked ? <Lock size={14} className="shrink-0 text-ink-2" /> : null}
                  </span>
                  <span className="text-xs leading-5 text-ink-2">
                    {isUnlocked ? iconDef.description : (gate?.description ?? 'ยังไม่ปลดล็อก')}
                  </span>
                </button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="chip" className="min-w-0">
          <p className="mb-2 text-sm font-bold text-ink">ชิปชื่อ</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onChipChange(NO_CHIP_ID)}
              className={tileClass(chipId === NO_CHIP_ID, true)}
              aria-pressed={chipId === NO_CHIP_ID}
            >
              <span className="text-sm font-bold text-ink">ไม่มีชิปชื่อ</span>
              <span className="text-xs text-ink-2">แสดงชื่อแบบปกติ</span>
            </button>
            {CHIPS.map((chipDef) => {
              const isUnlocked = canEquipChip(chipDef.id, unlocked);
              const selected = chipId === chipDef.id;
              const gate = achievementForChipReward(chipDef.id);
              return (
                <button
                  key={chipDef.id}
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => onChipChange(chipDef.id)}
                  className={tileClass(selected, isUnlocked)}
                  aria-pressed={selected}
                  aria-label={
                    isUnlocked
                      ? `เลือกชิปชื่อ ${chipDef.label}`
                      : `ล็อก ${chipDef.label}${gate ? ` — ${gate.description}` : ''}`
                  }
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="relative block min-w-0 flex-1">
                      <PlayerNameplate
                        name={previewLabel}
                        chipId={chipDef.id}
                        layout="tile"
                        className={!isUnlocked ? 'pr-8' : undefined}
                        nameClassName="text-xs font-bold"
                      />
                    </span>
                    {!isUnlocked ? <Lock size={14} className="shrink-0 text-ink-2" /> : null}
                  </span>
                  <span className="text-xs leading-5 text-ink-2">
                    {isUnlocked ? chipDef.description : (gate?.description ?? 'ยังไม่ปลดล็อก')}
                  </span>
                </button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="nameplate" className="min-w-0">
          <div className="flex flex-col gap-5">
            {nameplateSections().map((section) => {
              const wins =
                section.gameId != null
                  ? (matchStats.winsByGame?.[section.gameId] ?? 0)
                  : matchStats.wins;
              const plays =
                section.gameId != null
                  ? (matchStats.matchesByGame?.[section.gameId] ?? 0)
                  : matchStats.matchesPlayed;
              return (
                <div key={section.key}>
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="m-0 font-display text-base font-extrabold text-ink">
                      {section.label}
                    </h3>
                    <span className="text-xs text-ink-2">
                      {section.gameId ? `ชนะ ${wins} · เล่น ${plays} เกม` : `ชนะรวม ${wins} ครั้ง`}
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
                          className={cn(tileClass(selected, isUnlocked), 'min-h-14 gap-1')}
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
                            {isUnlocked
                              ? plate.description
                              : (gate?.description ?? 'ยังไม่ปลดล็อก')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
