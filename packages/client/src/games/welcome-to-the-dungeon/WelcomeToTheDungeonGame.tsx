import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type {
  WttdAction,
  WttdDungeonCombatAnimKind,
  WttdDungeonEquipFlags,
  WttdEquipmentId,
  WttdHeroClass,
  WttdHeroPickMode,
  WttdMonsterPower,
  WttdPlayerView,
  WttdWeaknessSymbol,
} from 'shared';
import {
  WTTD_ALL_MONSTER_POWERS,
  WTTD_DUNGEON_LOSSES_TO_ELIMINATE,
  WTTD_EQUIPMENT_BY_CLASS,
  WTTD_HERO_CLASSES,
  WTTD_WEAKNESS_SYMBOL_TH,
  wttdCanWeaknessPassMonster,
  wttdEquipmentIsWorn,
  wttdExplorerBaseHp,
  wttdExplorerHpBonusContributors,
  wttdExplorerMaxHpFromEquipment,
  wttdMonsterPowersPassableWithEquipment,
  wttdMonsterWeaknesses,
} from 'shared';
import { Button } from '../../components/ui';
import { imageMap } from '../../imageMap';
import {
  fireWttdDungeonRoundSurviveConfetti,
  startWinCelebrationLoop,
} from '../../utils/winCelebration';
import { BookOpen, ChevronDown, Home, LogOut, RotateCcw } from 'lucide-react';
import './welcome-to-the-dungeon.css';

const MODE_LABEL: Record<WttdHeroPickMode, string> = {
  normal: 'ปกติ (ไม่ซ้ำหลังสุ่มแก้ชน)',
  random_unique: 'สุ่มไม่ซ้ำ',
  same_host: 'เหมือนกันหมด (หัวห้อง)',
  free: 'อิสระ (ซ้ำได้)',
};

const HERO_TITLE: Record<WttdHeroClass, string> = {
  warrior: 'นักรบ',
  barbarian: 'คนเถื่อน',
  mage: 'นักเวท',
  rogue: 'โจร',
};

const HERO_FLIP_DURATION_SEC = 0.9;
const EQ_FLIP_STAGGER_SEC = 0.09;
const EQ_FLIP_DURATION_SEC = 0.75;

function eqShortLabel(id: WttdEquipmentId): string {
  const parts = id.split('_').slice(1);
  return parts.join(' ').replace(/-/g, ' ') || id;
}

function tagHueDegrees(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function tagHueForId(id: string): string {
  return `hsl(${tagHueDegrees(id)} 65% 42%)`;
}

type PickerInfo = { id: string; name: string; ready: boolean; role?: 'host' };

function pickersForHero(
  players: WttdPlayerView['players'],
  preferences: Record<string, WttdHeroClass | null>,
  ready: Record<string, boolean>,
  hero: WttdHeroClass,
): PickerInfo[] {
  return players
    .filter((p) => preferences[p.id] === hero)
    .map((p) => ({
      id: p.id,
      name: p.name,
      ready: ready[p.id] === true,
    }));
}

const PICK_FLIP_DURATION = 0.55;

function WttdPickHeroSlot({
  label,
  cardBackUrl,
  heroImgUrl,
  revealed,
  selectedByMe,
  hostHighlight,
  disabled,
  onPick,
  pickers,
  myId,
}: {
  label: string;
  cardBackUrl: string;
  heroImgUrl: string;
  revealed: boolean;
  selectedByMe: boolean;
  hostHighlight?: boolean;
  disabled: boolean;
  onPick: () => void;
  pickers: PickerInfo[];
  myId: string;
}) {
  return (
    <div className="wttd-pick-slot">
      <button
        type="button"
        className={`wttd-pick-card-hit${selectedByMe ? ' wttd-pick-card-hit--mine' : ''}${hostHighlight ? ' wttd-pick-card-hit--host-pick' : ''}`}
        disabled={disabled}
        onClick={onPick}
        aria-pressed={selectedByMe}
      >
        <div className="wttd-pick-card-frame">
          <div className="wttd-pick-flip-perspective">
            <motion.div
              className="wttd-pick-flip-inner"
              initial={false}
              animate={{ rotateY: revealed ? 180 : 0 }}
              transition={{ duration: PICK_FLIP_DURATION, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="wttd-pick-flip-face wttd-pick-flip-face--back" aria-hidden>
                <img src={cardBackUrl} alt="" className="wttd-pick-card-img" />
              </div>
              <div className="wttd-pick-flip-face wttd-pick-flip-face--front">
                <img src={heroImgUrl} alt={label} className="wttd-pick-card-img" />
              </div>
            </motion.div>
          </div>
        </div>
      </button>
      <span className="wttd-pick-card-label">{label}</span>
      <div className="wttd-pick-tags" aria-live="polite">
        {pickers.map((p) => {
          const initial = (p.name.trim().charAt(0) || '?').toUpperCase();
          const hue = tagHueDegrees(p.id);
          return (
            <span
              key={p.id}
              className={`wttd-pick-tag${p.ready ? ' wttd-pick-tag--ready' : ''}${p.id === myId ? ' wttd-pick-tag--me' : ''}${p.role === 'host' ? ' wttd-pick-tag--host' : ''}`}
              style={
                {
                  '--wttd-pick-tag-h': String(hue),
                  borderColor: tagHueForId(p.id),
                } as CSSProperties
              }
              title={p.name}
            >
              <span className="wttd-pick-tag__avatar" aria-hidden>
                {initial}
              </span>
              <span className="wttd-pick-tag__body">
                <span className="wttd-pick-tag__name">{p.name}</span>
                {(p.role === 'host' || p.ready) && (
                  <span className="wttd-pick-tag__chips">
                    {p.role === 'host' ? (
                      <span className="wttd-pick-tag__chip wttd-pick-tag__chip--host">หัวห้อง</span>
                    ) : null}
                    {p.ready ? (
                      <span className="wttd-pick-tag__chip wttd-pick-tag__chip--ready">พร้อม</span>
                    ) : null}
                  </span>
                )}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

const DUNGEON_STRIP_FLIP_SEC = 0.48;
const DUNGEON_STRIP_SLIDE_SEC = 0.58;

/** แถบกองคว่ำ (ประมูล): คลื่นผลักซ้าย→ขวา + ใบใหม่เลื่อนเข้าจากซ้าย */
const DUNGEON_BID_PUSH_EXISTING_SHIFT = 18;
const DUNGEON_BID_PUSH_EXISTING_STAGGER = 0.042;
const DUNGEON_BID_PUSH_EXISTING_DELAY_BASE = 0.08;
const DUNGEON_BID_PUSH_NEW_ENTER_PX = 220;

type BiddingDungeonSlotCustom = { i: number; newIdx: number };

const BID_EASE = [0.22, 1, 0.36, 1] as const;

const biddingDungeonSlotVariants = {
  idle: { x: 0, y: 0, opacity: 1, scale: 1 },
  pushIn: (c: BiddingDungeonSlotCustom) => {
    const { i, newIdx } = c;
    if (newIdx < 0 || i > newIdx) {
      return { x: 0, y: 0, opacity: 1, scale: 1 };
    }
    if (i === newIdx) {
      return {
        x: [-DUNGEON_BID_PUSH_NEW_ENTER_PX, 0],
        opacity: [0.68, 1],
        scale: [0.95, 1],
        transition: {
          duration: DUNGEON_STRIP_SLIDE_SEC,
          ease: BID_EASE,
        },
      };
    }
    return {
      x: [DUNGEON_BID_PUSH_EXISTING_SHIFT, 0],
      transition: {
        duration: 0.4,
        ease: BID_EASE,
        delay: DUNGEON_BID_PUSH_EXISTING_DELAY_BASE + i * DUNGEON_BID_PUSH_EXISTING_STAGGER,
      },
    };
  },
};

const WTTD_DECK_LAYER_COUNT = 5;
const WTTD_DECK_SHUFFLE_KEY = 0;
/** ระยะเลื่อนชั้นกองการ์ด — ปรับให้สอดคล้องกับความกว้างกองใน CSS */
const WTTD_DECK_LAYER_OFFSET_PX = 7;

/** อธิบายแพ้ทาง (ประมูล / ไกด์) — กฎเต็มในเฟสดันเจี้ยนอยู่ที่โมดัลต่อสู้ */
const WTTD_MONSTER_WEAKNESS_HELP =
  'แต่ละมอนมีสัญลักษณ์ «แพ้ทาง» กำหนดในเกม — ถ้ามีการ์ดอุปกรณ์ที่มีสัญลักษณ์ตรงกัน จะผ่านมอนในเฟสดันเจี้ยนโดยไม่เสีย HP และการ์ดแพ้ทางไม่ถูกทิ้งจากชุด';

function WttdMonsterDeckStack({
  cardBack,
  deckRemaining,
  dungeonFaceDownCount,
}: {
  cardBack: string;
  deckRemaining: number;
  dungeonFaceDownCount: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <section className="wttd-deck-stack" aria-labelledby="wttd-deck-stack-title">
      <h3 id="wttd-deck-stack-title" className="wttd-deck-stack__title">
        สำรับมอนกลางโต๊ะ
      </h3>
      <div className="wttd-deck-stack__cards" aria-hidden>
        <motion.div
          key={WTTD_DECK_SHUFFLE_KEY}
          className="wttd-deck-stack-inner"
          initial={{ rotate: 0, x: 0 }}
          animate={
            reduceMotion
              ? { rotate: 0, x: 0 }
              : { rotate: [0, -4, 3.5, -2, 0], x: [0, 3, -3, 1, 0] }
          }
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {Array.from({ length: WTTD_DECK_LAYER_COUNT }, (_, i) => (
            <motion.img
              key={i}
              src={cardBack}
              alt=""
              className="wttd-deck-layer"
              style={{
                left: i * WTTD_DECK_LAYER_OFFSET_PX,
                top: -i * WTTD_DECK_LAYER_OFFSET_PX,
                zIndex: WTTD_DECK_LAYER_COUNT - i,
              }}
              initial={false}
              animate={
                reduceMotion
                  ? { x: 0, y: 0, rotate: 0 }
                  : {
                      x: [0, (i % 2 === 0 ? 2 : -2) + i * 0.35, 0],
                      y: [0, -4, 0],
                      rotate: [0, (i - 2) * 2.5, 0],
                    }
              }
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: i * 0.035 }}
            />
          ))}
        </motion.div>
      </div>
      <dl className="wttd-deck-stack-stats">
        <dt>สำรับเหลือ</dt>
        <dd>
          <strong>{deckRemaining}</strong> ใบ
        </dd>
        <dt>ในกองดันเจี้ยน (คว่ำ)</dt>
        <dd>
          <strong>{dungeonFaceDownCount}</strong> ใบ
        </dd>
      </dl>
      <p className="wttd-deck-stack-meta">จั่วจากสำรับนี้เมื่อถึงคิว — ดูแถบกองดันเจี้ยนด้านบน</p>
    </section>
  );
}

function WttdDungeonStrip({
  cardBack,
  monsterByPower,
  phase,
  faceDownCountBidding,
  stackPreview,
  dungeonRun,
}: {
  cardBack: string;
  monsterByPower: (typeof imageMap.welcomeToTheDungeon)['monsterByPower'];
  phase: WttdPlayerView['phase'];
  faceDownCountBidding: number;
  stackPreview: WttdPlayerView['dungeonStackPreview'];
  dungeonRun: WttdPlayerView['dungeonRun'];
}) {
  const prevBidCount = useRef(faceDownCountBidding);
  const [pushAnim, setPushAnim] = useState<{ newIdx: number } | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (phase !== 'bidding') {
      prevBidCount.current = faceDownCountBidding;
      setPushAnim(null);
      return;
    }
    if (faceDownCountBidding > prevBidCount.current) {
      if (reduceMotion !== true) {
        setPushAnim({ newIdx: faceDownCountBidding - 1 });
      }
    }
    prevBidCount.current = faceDownCountBidding;
  }, [phase, faceDownCountBidding, reduceMotion]);

  if (phase === 'bidding') {
    const pushTargetIdx = pushAnim?.newIdx ?? -1;
    return (
      <div className="wttd-dungeon-strip wttd-dungeon-strip--bidding" aria-label="กองดันเจี้ยน">
        <div className="wttd-dungeon-strip__row">
          {faceDownCountBidding === 0 ? (
            <p className="wttd-dungeon-strip__empty">
              ยังไม่มีการ์ดในดันเจี้ยน — ใส่จากสำรับมอนด้านล่างเมื่อถึงคิว
            </p>
          ) : (
            Array.from({ length: faceDownCountBidding }).map((_, i) => (
              <motion.div
                key={`bid-dung-${i}`}
                className="wttd-dungeon-slot wttd-dungeon-slot--back-only"
                custom={{ i, newIdx: pushTargetIdx }}
                variants={biddingDungeonSlotVariants}
                initial={false}
                animate={reduceMotion === true || !pushAnim ? 'idle' : 'pushIn'}
                onAnimationComplete={() => {
                  if (pushAnim?.newIdx === i) setPushAnim(null);
                }}
              >
                <img src={cardBack} alt="" />
              </motion.div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (phase === 'dungeon' && dungeonRun && stackPreview && stackPreview.length > 0) {
    const { resolvedCount, currentCard } = dungeonRun;
    return (
      <div className="wttd-dungeon-strip wttd-dungeon-strip--run" aria-label="ลำดับมอนในดันเจี้ยน">
        <div className="wttd-dungeon-strip__row">
          {stackPreview.map((pow, i) => {
            const isPast = i < resolvedCount;
            const isCurrent = i === resolvedCount;
            const showFace = isPast || (isCurrent && currentCard != null);
            const facePow = isPast ? pow : isCurrent && currentCard != null ? currentCard : pow;

            return (
              <div
                key={`dung-slot-${i}-${pow}`}
                className={`wttd-dungeon-slot-wrap${isCurrent && currentCard != null ? ' wttd-dungeon-slot-wrap--active' : ''}`}
              >
                <div className="wttd-dungeon-slot-perspective">
                  <motion.div
                    className="wttd-dungeon-slot-flip-inner"
                    initial={false}
                    animate={{ rotateY: showFace ? 180 : 0 }}
                    transition={{ duration: DUNGEON_STRIP_FLIP_SEC, ease: [0.22, 1, 0.36, 1] }}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div
                      className="wttd-dungeon-slot-face wttd-dungeon-slot-face--back"
                      aria-hidden
                    >
                      <img src={cardBack} alt="" />
                    </div>
                    <div className="wttd-dungeon-slot-face wttd-dungeon-slot-face--front">
                      <img src={monsterByPower[facePow as keyof typeof monsterByPower]} alt="" />
                    </div>
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

/** Versus modal — ความยาวอนิเมชันต่อสู้ (รอให้จบก่อนส่งแอคชัน) */
const WTTD_VS_FX_DAMAGE_MS = 1300;
const WTTD_VS_FX_WEAK_MS = 1000;
/** การ์ดโชว์มุมขวาล่าง: ลอยขึ้น → ค้าง → เลื่อนลง */
const WTTD_VS_CARD_SHOWCASE_RISE_MS = 420;
const WTTD_VS_CARD_SHOWCASE_HOLD_MS = 2000;
const WTTD_VS_CARD_SHOWCASE_EXIT_MS = 480;

type WttdVsFightFx = 'idle' | 'take_damage' | 'weakness_win' | 'special_win';

type WttdVsCardFlyPhase = 'rise_anim' | 'hold' | 'exit_anim';

type WttdVsCardFly = null | {
  left: number;
  top: number;
  w: number;
  h: number;
  /** translateY(px) บวก = เลื่อนลง */
  yPx: number;
  transitionMs: number;
  phase: WttdVsCardFlyPhase;
  dropPx: number;
  url: string;
};

function WttdVersusModal({
  heroTitle,
  heroImg,
  equipment,
  equipmentUrls,
  weaknessIconUrls,
  hp,
  hpMax,
  monsterImageUrlForPower,
  isExplorer,
  canReveal,
  mustResolve,
  currentPower,
  equipFlags,
  vorpalPrecogMonsterPower,
  demonicPactBanishNextReveal,
  combatAnimSeq,
  combatAnimKind,
  combatPlayedEquipmentId,
  combatMonsterPower,
  onReveal,
  onTakeDamage,
  onWeaknessPass,
  onVorpalBlade,
  onVorpalAxe,
  onDemonicPact,
  onPolymorph,
  onRingOfPower,
  eqShort,
}: {
  heroTitle: string;
  heroImg: string;
  equipment: WttdEquipmentId[];
  equipmentUrls: Record<WttdEquipmentId, string>;
  weaknessIconUrls: Record<WttdWeaknessSymbol, string>;
  hp: number;
  hpMax: number;
  monsterImageUrlForPower: (power: WttdMonsterPower) => string;
  isExplorer: boolean;
  canReveal: boolean;
  mustResolve: boolean;
  currentPower: WttdMonsterPower | null;
  equipFlags: WttdDungeonEquipFlags;
  vorpalPrecogMonsterPower: WttdMonsterPower | null;
  demonicPactBanishNextReveal: boolean;
  combatAnimSeq: number;
  combatAnimKind: WttdDungeonCombatAnimKind;
  combatPlayedEquipmentId: WttdEquipmentId | null;
  combatMonsterPower: WttdMonsterPower | null;
  onReveal: () => void;
  onTakeDamage: () => void;
  onWeaknessPass: (eq: WttdEquipmentId) => void;
  onVorpalBlade: () => void;
  onVorpalAxe: () => void;
  onDemonicPact: () => void;
  onPolymorph: () => void;
  onRingOfPower: () => void;
  eqShort: (id: WttdEquipmentId) => string;
}) {
  const reduceMotion = useReducedMotion();
  /** ลำดับแอนิเมชันต่อสู้ล่าสุดที่เล่นแล้ว — ใช้ร่วมกันทั้งผู้เข้าและผู้ชม */
  const appliedCombatAnimSeqRef = useRef(0);
  const [selectedEq, setSelectedEq] = useState<WttdEquipmentId | null>(null);
  const [fightFx, setFightFx] = useState<WttdVsFightFx>('idle');
  const [fxMonsterPower, setFxMonsterPower] = useState<WttdMonsterPower | null>(null);
  const [cardFly, setCardFly] = useState<WttdVsCardFly>(null);
  const fightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hpPct = hpMax > 0 ? (100 * hp) / hpMax : 0;
  const inResolve = mustResolve && currentPower != null;
  const monsterPowerForBadges = currentPower ?? fxMonsterPower;
  const weaknessKeys: readonly WttdWeaknessSymbol[] =
    mustResolve && monsterPowerForBadges != null
      ? wttdMonsterWeaknesses(monsterPowerForBadges)
      : [];
  const matchingEquipment: WttdEquipmentId[] =
    inResolve && currentPower != null
      ? equipment.filter((eq) => wttdCanWeaknessPassMonster(currentPower, eq))
      : [];
  const matchingPlayable: WttdEquipmentId[] = matchingEquipment.filter(
    (eq) => !wttdEquipmentIsWorn(eq),
  );
  const fightBusy = fightFx !== 'idle';

  const canVorpalBlade =
    inResolve &&
    currentPower != null &&
    vorpalPrecogMonsterPower != null &&
    currentPower === vorpalPrecogMonsterPower &&
    !equipFlags.vorpalBladeUsed &&
    (equipment.includes('warrior_vorpal_sword') || equipment.includes('rogue_vorpal_dagger'));
  const canVorpalAxe =
    inResolve &&
    currentPower != null &&
    !equipFlags.vorpalAxeUsed &&
    equipment.includes('barbarian_vorpal_axe');
  const canDemonicPact =
    inResolve &&
    currentPower === 7 &&
    !equipFlags.demonicPactUsed &&
    equipment.includes('mage_demonic_pact');
  const canPolymorph =
    inResolve &&
    currentPower != null &&
    !equipFlags.polymorphUsed &&
    equipment.includes('mage_polymorph');
  const canRingOfPower =
    inResolve &&
    currentPower != null &&
    currentPower <= 2 &&
    equipment.includes('rogue_ring_of_power');

  /** เล่นการ์ดพิเศษจากแถบอุปกรณ์ (ไม่ใช่แพ้ทาง) — ตรวจทีละใบ */
  const specialPlayableForEq = useCallback(
    (eq: WttdEquipmentId): boolean => {
      if (!inResolve || fightBusy) return false;
      if (
        (eq === 'warrior_vorpal_sword' || eq === 'rogue_vorpal_dagger') &&
        canVorpalBlade &&
        equipment.includes(eq)
      ) {
        return true;
      }
      if (eq === 'barbarian_vorpal_axe' && canVorpalAxe) return true;
      if (eq === 'mage_demonic_pact' && canDemonicPact) return true;
      if (eq === 'mage_polymorph' && canPolymorph) return true;
      if (eq === 'rogue_ring_of_power' && canRingOfPower) return true;
      return false;
    },
    [
      inResolve,
      fightBusy,
      canVorpalBlade,
      canVorpalAxe,
      canDemonicPact,
      canPolymorph,
      canRingOfPower,
      equipment,
    ],
  );

  const hasSpecialPlayOption = useMemo(
    () => equipment.some((eq) => specialPlayableForEq(eq)),
    [equipment, specialPlayableForEq],
  );

  const heroVsAnim = useMemo(() => {
    if (fightFx === 'take_damage') {
      return {
        rotateZ: [0, 0, -90, 0],
        y: 0,
        transition: {
          duration: WTTD_VS_FX_DAMAGE_MS / 1000,
          times: [0, 0.28, 0.55, 1],
          ease: [0.22, 1, 0.36, 1] as const,
        },
      };
    }
    if (fightFx === 'weakness_win' || fightFx === 'special_win') {
      return {
        y: [0, -11, 0, 0],
        rotateZ: 0,
        transition: {
          duration: WTTD_VS_FX_WEAK_MS / 1000,
          times: [0, 0.1, 0.22, 1],
          ease: 'easeInOut' as const,
        },
      };
    }
    return {
      rotateZ: 0,
      y: 0,
      transition: { duration: 0.2 },
    };
  }, [fightFx]);

  const monsterVsAnim = useMemo(() => {
    if (fightFx === 'take_damage') {
      return {
        y: [0, -12, 0, 0],
        opacity: [1, 1, 1, 0],
        rotateZ: 0,
        transition: {
          duration: WTTD_VS_FX_DAMAGE_MS / 1000,
          times: [0, 0.14, 0.28, 1],
          ease: 'easeInOut' as const,
        },
      };
    }
    if (fightFx === 'weakness_win') {
      return {
        rotateZ: [0, 0, 90, 0],
        opacity: [1, 1, 1, 0],
        y: 0,
        transition: {
          duration: WTTD_VS_FX_WEAK_MS / 1000,
          times: [0, 0.22, 0.52, 1],
          ease: [0.22, 1, 0.36, 1] as const,
        },
      };
    }
    if (fightFx === 'special_win') {
      return {
        rotateZ: [0, 0, 90, -90],
        opacity: [1, 1, 1, 0],
        y: 0,
        transition: {
          duration: WTTD_VS_FX_WEAK_MS / 1000,
          times: [0, 0.22, 0.52, 1],
          ease: [0.22, 1, 0.36, 1] as const,
        },
      };
    }
    return {
      y: 0,
      opacity: 1,
      rotateZ: 0,
      transition: { duration: 0.2 },
    };
  }, [fightFx]);

  const clearFightTimer = useCallback(() => {
    if (fightTimerRef.current != null) {
      clearTimeout(fightTimerRef.current);
      fightTimerRef.current = null;
    }
  }, []);

  /** โชว์การ์ดใหญ่จากมุมขวาล่าง — ไม่ผูกกับตำแหน่งปุ่มใน modal */
  const launchEquipmentCardShowcase = useCallback(
    (url: string) => {
      if (reduceMotion === true) return;
      if (isExplorer) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(200, Math.max(112, vw * 0.24));
      const h = w * (808 / 504);
      const marginX = 20;
      const marginBottom = 40;
      const left = vw - w - marginX;
      const top = vh - h - marginBottom;
      const dropPx = vh - top + 56;
      setCardFly({
        url,
        left,
        top,
        w,
        h,
        yPx: dropPx,
        transitionMs: 0,
        phase: 'rise_anim',
        dropPx,
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setCardFly((prev) =>
            prev && prev.phase === 'rise_anim'
              ? {
                  ...prev,
                  yPx: 0,
                  transitionMs: WTTD_VS_CARD_SHOWCASE_RISE_MS,
                }
              : prev,
          );
        });
      });
    },
    [isExplorer, reduceMotion],
  );

  useEffect(() => {
    return () => clearFightTimer();
  }, [clearFightTimer]);

  useEffect(() => {
    if (cardFly?.phase !== 'hold') return;
    const t = setTimeout(() => {
      setCardFly((p) =>
        p && p.phase === 'hold'
          ? {
              ...p,
              phase: 'exit_anim',
              yPx: p.dropPx,
              transitionMs: WTTD_VS_CARD_SHOWCASE_EXIT_MS,
            }
          : p,
      );
    }, WTTD_VS_CARD_SHOWCASE_HOLD_MS);
    return () => clearTimeout(t);
  }, [cardFly?.phase, cardFly?.url]);

  useEffect(() => {
    if (combatAnimSeq === 0) {
      appliedCombatAnimSeqRef.current = 0;
      return;
    }
    if (combatAnimSeq <= appliedCombatAnimSeqRef.current) return;
    appliedCombatAnimSeqRef.current = combatAnimSeq;
    clearFightTimer();
    if (combatAnimKind === 'none') return;
    if (reduceMotion === true) return;
    if (combatMonsterPower != null) setFxMonsterPower(combatMonsterPower);
    if (combatAnimKind === 'take_damage') setFightFx('take_damage');
    else if (combatAnimKind === 'weakness') setFightFx('weakness_win');
    else if (combatAnimKind === 'special_monster') setFightFx('special_win');
    const ms = combatAnimKind === 'take_damage' ? WTTD_VS_FX_DAMAGE_MS : WTTD_VS_FX_WEAK_MS;
    fightTimerRef.current = setTimeout(() => {
      fightTimerRef.current = null;
      setFightFx('idle');
      setFxMonsterPower(null);
    }, ms);
    if (combatPlayedEquipmentId != null && equipmentUrls[combatPlayedEquipmentId]) {
      launchEquipmentCardShowcase(equipmentUrls[combatPlayedEquipmentId]);
    }
  }, [
    clearFightTimer,
    combatAnimKind,
    combatAnimSeq,
    combatMonsterPower,
    combatPlayedEquipmentId,
    equipmentUrls,
    launchEquipmentCardShowcase,
    reduceMotion,
  ]);

  useEffect(() => {
    if (currentPower == null && fxMonsterPower == null && fightFx !== 'idle') {
      setFightFx('idle');
    }
  }, [currentPower, fxMonsterPower, fightFx]);

  useEffect(() => {
    setSelectedEq(null);
  }, [mustResolve, currentPower]);

  useEffect(() => {
    if (
      selectedEq != null &&
      (currentPower == null ||
        (!matchingPlayable.includes(selectedEq) && !specialPlayableForEq(selectedEq)))
    ) {
      setSelectedEq(null);
    }
  }, [currentPower, matchingPlayable, selectedEq, specialPlayableForEq]);

  const scheduleTakeDamage = useCallback(() => {
    if (fightBusy) return;
    onTakeDamage();
  }, [fightBusy, onTakeDamage]);

  const scheduleWeaknessPass = useCallback(() => {
    if (fightBusy || selectedEq == null) return;
    onWeaknessPass(selectedEq);
  }, [fightBusy, onWeaknessPass, selectedEq]);

  const canDispatchPlay =
    selectedEq != null &&
    !fightBusy &&
    (specialPlayableForEq(selectedEq) || matchingPlayable.includes(selectedEq));

  const dispatchSpecialFromEq = useCallback(
    (eq: WttdEquipmentId) => {
      if (eq === 'warrior_vorpal_sword' || eq === 'rogue_vorpal_dagger') {
        onVorpalBlade();
      } else if (eq === 'barbarian_vorpal_axe') {
        onVorpalAxe();
      } else if (eq === 'mage_demonic_pact') {
        onDemonicPact();
      } else if (eq === 'mage_polymorph') {
        onPolymorph();
      } else if (eq === 'rogue_ring_of_power') {
        onRingOfPower();
      }
    },
    [onDemonicPact, onPolymorph, onRingOfPower, onVorpalAxe, onVorpalBlade],
  );

  const dispatchPlayCard = useCallback(() => {
    if (fightBusy || selectedEq == null) return;
    if (specialPlayableForEq(selectedEq)) {
      dispatchSpecialFromEq(selectedEq);
      setSelectedEq(null);
      return;
    }
    if (matchingPlayable.includes(selectedEq)) {
      scheduleWeaknessPass();
    }
  }, [
    dispatchSpecialFromEq,
    fightBusy,
    matchingPlayable,
    scheduleWeaknessPass,
    selectedEq,
    specialPlayableForEq,
  ]);

  const displayMonsterPower = currentPower ?? fxMonsterPower;
  const displayMonsterUrl =
    displayMonsterPower != null ? monsterImageUrlForPower(displayMonsterPower) : null;
  const showMonsterSilhouette = displayMonsterUrl == null;

  const onCardFlyTransitionEnd = useCallback((e: React.TransitionEvent<HTMLImageElement>) => {
    if (e.propertyName !== 'transform') return;
    setCardFly((prev) => {
      if (!prev) return null;
      if (prev.phase === 'rise_anim' && prev.transitionMs > 0 && prev.yPx === 0) {
        return { ...prev, phase: 'hold', transitionMs: 0, yPx: 0 };
      }
      if (prev.phase === 'exit_anim') return null;
      return prev;
    });
  }, []);

  return (
    <div className="wttd-vs-modal" role="dialog" aria-modal aria-labelledby="wttd-vs-title">
      <div className="wttd-vs-modal__inner">
        <h2 id="wttd-vs-title" className="wttd-vs-modal__title">
          ดันเจี้ยน
        </h2>
        <div className="wttd-vs-modal__hp-block">
          <span className="wttd-vs-modal__hp-label">HP รอบนี้</span>
          <span className="wttd-vs-modal__hp-val">
            {hp}/{hpMax}
          </span>
          <div className="wttd-vs-modal__hp-meter" aria-hidden>
            <div className="wttd-vs-modal__hp-fill" style={{ width: `${hpPct}%` }} />
          </div>
        </div>

        <div className="wttd-vs-modal__arena">
          <div className="wttd-vs-modal__side wttd-vs-modal__side--hero">
            <motion.div
              className="wttd-vs-modal__hero-card-motion"
              initial={false}
              animate={heroVsAnim}
            >
              <div className="wttd-vs-modal__hero-card">
                <img src={heroImg} alt={heroTitle} />
              </div>
            </motion.div>
            <p className="wttd-vs-modal__side-label">{heroTitle}</p>
            <p className="wttd-vs-modal__hint">
              เมื่อเปิดมอนแล้ว: เลือกการ์ดที่ตรงแพ้ทางหรือการ์ดพิเศษที่เล่นได้ แล้วกดเล่นการ์ด —
              หรือรับดาเมจ (การ์ดสวมใส่ใช้แพ้ทางไม่ได้)
            </p>
          </div>

          <div className="wttd-vs-modal__vs" aria-hidden>
            VS
          </div>

          <div className="wttd-vs-modal__side wttd-vs-modal__side--monster">
            <motion.div
              className="wttd-vs-modal__monster-card-motion"
              initial={false}
              animate={monsterVsAnim}
            >
              <div
                className={`wttd-vs-modal__monster-card${showMonsterSilhouette ? ' wttd-vs-modal__monster-card--silhouette' : ''}`}
              >
                {displayMonsterUrl ? (
                  <img src={displayMonsterUrl} alt="" />
                ) : (
                  <span className="wttd-vs-modal__monster-q">?</span>
                )}
              </div>
            </motion.div>
            {/* <p className="wttd-vs-modal__side-label">มอนสเตอร์</p>
            {currentPower != null && <p className="wttd-vs-modal__pow">พลัง {currentPower}</p>} */}
            {weaknessKeys.length > 0 && (
              <div className="wttd-vs-modal__weaknesses">
                <p className="wttd-vs-modal__weak-label">แพ้ทาง</p>
                <ul className="wttd-vs-modal__weak-list">
                  {weaknessKeys.map((sym) => (
                    <li key={sym} className="wttd-vs-modal__weak-item">
                      <img
                        src={weaknessIconUrls[sym]}
                        alt=""
                        className="wttd-vs-modal__weak-icon"
                      />
                      <span>{WTTD_WEAKNESS_SYMBOL_TH[sym]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {!isExplorer && (
          <p className="wttd-vs-modal__spectate">คุณรออยู่นอกดันเจี้ยน — ดูการตัดสินของผู้เข้า</p>
        )}

        {isExplorer && (
          <div className="wttd-vs-modal__actions">
            {(canReveal || inResolve) && (
              <div className="wttd-vs-modal__eq-actions" role="group" aria-label="อุปกรณ์ในชุด">
                {equipment.length === 0 ? (
                  <span className="wttd-vs-modal__eq-empty">ไม่มีอุปกรณ์</span>
                ) : (
                  equipment.map((eq) => {
                    const worn = wttdEquipmentIsWorn(eq);
                    const canMatch =
                      inResolve &&
                      currentPower != null &&
                      wttdCanWeaknessPassMonster(currentPower, eq);
                    const weaknessPlayable = inResolve && !fightBusy && canMatch && !worn;
                    const specialPlayable = specialPlayableForEq(eq);
                    const selectable = weaknessPlayable || specialPlayable;
                    const selected = selectedEq === eq;
                    const title = !inResolve
                      ? `${eqShort(eq)} — รอเปิดการ์ดถัดไป`
                      : fightBusy
                        ? `${eqShort(eq)} — กำลังตัดสิน…`
                        : worn
                          ? `${eqShort(eq)} — สวมใส่ (เล่นการ์ดไม่ได้)`
                          : weaknessPlayable && specialPlayable
                            ? `${eqShort(eq)} — แพ้ทางหรือพิเศษ — กดเล่นการ์ดใช้พลังพิเศษ (กำจัดมอน 7)`
                            : weaknessPlayable
                              ? `${eqShort(eq)} — แพ้ทาง (เลือกแล้วกดเล่นการ์ด)`
                              : specialPlayable
                                ? `${eqShort(eq)} — การ์ดพิเศษ (เลือกแล้วกดเล่นการ์ด)`
                                : !canMatch
                                  ? `${eqShort(eq)} — ไม่ตรงสัญลักษณ์แพ้ทาง`
                                  : eqShort(eq);
                    return (
                      <button
                        key={eq}
                        type="button"
                        data-wttd-vs-eq={eq}
                        className={`wttd-vs-modal__eq-pick${selected ? ' wttd-vs-modal__eq-pick--selected' : ''}${worn ? ' wttd-vs-modal__eq-pick--worn' : ''}${specialPlayable ? ' wttd-vs-modal__eq-pick--special-playable' : ''}${inResolve && !selectable && !worn ? ' wttd-vs-modal__eq-pick--off' : ''}${!inResolve ? ' wttd-vs-modal__eq-pick--waiting' : ''}`}
                        disabled={!selectable}
                        title={title}
                        aria-pressed={selected}
                        onClick={() => {
                          if (!selectable) return;
                          setSelectedEq((s) => (s === eq ? null : eq));
                        }}
                      >
                        <img src={equipmentUrls[eq]} alt="" />
                      </button>
                    );
                  })
                )}
              </div>
            )}
            {canReveal ? (
              <div className="wttd-vs-modal__resolve-actions">
                {demonicPactBanishNextReveal ? (
                  <p className="wttd-vs-modal__banish-hint">
                    สัญญาปีศาจ: การ์ดนี้จะถูกกำจัดทันทีเมื่อเปิด
                  </p>
                ) : null}
                <Button type="button" onClick={onReveal} disabled={fightBusy}>
                  เปิดการ์ดถัดไป
                </Button>
              </div>
            ) : inResolve ? (
              <>
                <div className="wttd-vs-modal__resolve-actions">
                  <Button type="button" onClick={scheduleTakeDamage} disabled={fightBusy}>
                    รับดาเมจ {currentPower}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!canDispatchPlay}
                    onClick={dispatchPlayCard}
                  >
                    เล่นการ์ด
                  </Button>
                </div>
                {matchingPlayable.length === 0 && !hasSpecialPlayOption && (
                  <p className="wttd-vs-modal__no-weak">
                    {matchingEquipment.length > 0
                      ? 'มีใบที่ตรงแพ้ทางแต่เป็นของสวมใส่ — ต้องรับดาเมจ'
                      : 'ไม่มีอุปกรณ์ที่ตรงแพ้ทางหรือการ์ดพิเศษที่เล่นได้ — ต้องรับดาเมจ'}
                  </p>
                )}
                {matchingPlayable.length === 0 && hasSpecialPlayOption && (
                  <p className="wttd-vs-modal__no-weak wttd-vs-modal__no-weak--hint">
                    ไม่มีแพ้ทาง — เลือกการ์ดพิเศษ (ขอบทอง) แล้วกดเล่นการ์ด หรือรับดาเมจ
                  </p>
                )}
              </>
            ) : null}
          </div>
        )}

        <p className="wttd-vs-modal__footer-note">
          เอกภพ: หากรอดดันเจี้ยนและพลังมอนทุกใบในรอบไม่ซ้ำกัน = ชนะเกมทันที
        </p>
      </div>
      {cardFly != null ? (
        <img
          src={cardFly.url}
          alt=""
          className="wttd-vs-fly-card"
          style={{
            position: 'fixed',
            left: cardFly.left,
            top: cardFly.top,
            width: cardFly.w,
            height: cardFly.h,
            zIndex: 10000,
            pointerEvents: 'none',
            borderRadius: 12,
            objectFit: 'cover',
            boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
            transition:
              cardFly.transitionMs > 0
                ? `transform ${cardFly.transitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`
                : 'none',
            transform: `translateY(${cardFly.yPx}px)`,
          }}
          onTransitionEnd={onCardFlyTransitionEnd}
        />
      ) : null}
    </div>
  );
}

type WttdDungeonRoundOutcome = {
  survived: boolean;
  explorerName: string;
  seq: number;
  heroImg: string;
  heroTitle: string;
};

function WttdDungeonRoundOutcomeOverlay({
  outcome,
  onDismiss,
}: {
  outcome: WttdDungeonRoundOutcome;
  onDismiss: () => void;
}) {
  const panelClass = outcome.survived
    ? 'wttd-dungeon-outcome-lightbox__panel wttd-dungeon-outcome-lightbox__panel--win'
    : 'wttd-dungeon-outcome-lightbox__panel wttd-dungeon-outcome-lightbox__panel--lose';

  return (
    <div
      className="wttd-dungeon-outcome-lightbox"
      role="dialog"
      aria-modal
      aria-labelledby="wttd-dungeon-outcome-title"
      onClick={onDismiss}
    >
      <div className={panelClass} onClick={(e) => e.stopPropagation()}>
        <div className="wttd-dungeon-outcome-lightbox__hero-block">
          <div className="wttd-dungeon-outcome-lightbox__hero-card">
            <img src={outcome.heroImg} alt={`การ์ดฮีโร่ ${outcome.heroTitle}`} />
          </div>
          <p className="wttd-dungeon-outcome-lightbox__hero-label">{outcome.heroTitle}</p>
        </div>
        <h2 id="wttd-dungeon-outcome-title" className="wttd-dungeon-outcome-lightbox__title">
          {outcome.survived ? 'รอดดันเจี้ยน!' : 'ล้มเหลวในดันเจี้ยน'}
        </h2>
        <p className="wttd-dungeon-outcome-lightbox__lead">
          {outcome.survived ? (
            <>
              <strong>{outcome.explorerName}</strong> ผ่านกองมอนสเตอร์ครบ — เก็บถ้วยชัย 1 ชิ้น
            </>
          ) : (
            <>
              <strong>{outcome.explorerName}</strong> ไม่รอดในรอบนี้ — บันทึกการแพ้ในดันเจี้ยน 1
              ครั้ง
            </>
          )}
        </p>
        <div className="wttd-dungeon-outcome-lightbox__actions">
          <Button type="button" onClick={onDismiss}>
            ตกลง
          </Button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  gameState: WttdPlayerView;
  myId: string;
  sendAction: (action: WttdAction) => void;
  onLeave: () => void;
  onRestart?: () => void;
  isHost?: boolean;
}

/** หัวหน้าเดียวกัน: ชื่อเฟส + ล็อบบี้/ออก — ใช้ทั้งเลือกฮีโร่ / เปิดบทบาท / โต๊ะหลัก */
function WttdScreenHeader({
  title,
  description,
  isHost,
  onRestart,
  onLeave,
}: {
  title: ReactNode;
  description?: ReactNode;
  isHost?: boolean;
  onRestart?: () => void;
  onLeave: () => void;
}) {
  return (
    <header className="wttd-top">
      <div>
        <div className="wttd-title">{title}</div>
        {description != null ? description : null}
      </div>
      <div className="wttd-actions">
        {isHost && onRestart && (
          <Button type="button" variant="secondary" onClick={onRestart}>
            <RotateCcw size={18} aria-hidden />
            เล่นใหม่
          </Button>
        )}
        <Button type="button" variant="danger" onClick={onLeave}>
          <LogOut size={18} aria-hidden />
          ออกจากห้อง
        </Button>
      </div>
    </header>
  );
}

function WttdHeroPick({
  gs,
  myId,
  sendAction,
  isHost,
}: {
  gs: WttdPlayerView;
  myId: string;
  sendAction: (action: WttdAction) => void;
  isHost: boolean;
}) {
  const hp = gs.heroPick;
  if (!hp) return null;

  const w = imageMap.welcomeToTheDungeon;
  const mode = hp.mode;

  if (mode === 'random_unique') {
    return (
      <div className="wttd-panel">
        <div className="wttd-pick-random-panel">
          <h3 style={{ fontSize: '1.05rem', marginBottom: 8 }}>สุ่มฮีโร่ไม่ซ้ำ</h3>
          <p className="wttd-pick-stage-hint" style={{ marginBottom: 0 }}>
            ระบบกำลังจัดสรรคลาสให้ทุกคน — รอสักครู่…
          </p>
          <div className="wttd-pick-random-cards" aria-hidden>
            <div className="wttd-pick-random-card" />
            <div className="wttd-pick-random-card" />
            <div className="wttd-pick-random-card" />
            <div className="wttd-pick-random-card" />
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'same_host') {
    const picked = hp.hostTableHero;
    const hostName = gs.players.find((p) => p.id === hp.hostId)?.name ?? 'หัวห้อง';
    return (
      <div className="wttd-panel">
        <div className="wttd-pick-stage">
          <h3 style={{ fontSize: '1.05rem', marginBottom: 8, textAlign: 'center' }}>
            ฮีโร่กลางโต๊ะ
          </h3>
          <p className="wttd-pick-stage-hint">
            {isHost
              ? 'เลือกการ์ดหนึ่งใบหรือกดสุ่ม — ทุกคนจะได้คลาสเดียวกัน จากนั้นกดพร้อมเล่น'
              : `รอ ${hostName} (หัวห้อง) เลือกหรือสุ่ม — การ์ดที่ถูกเลือกจะพลิกโชว์คลาส`}
          </p>
          <div className="wttd-pick-grid">
            {WTTD_HERO_CLASSES.map((c) => {
              const revealed = picked === c;
              const pickers: PickerInfo[] =
                picked === c ? [{ id: hp.hostId, name: hostName, ready: true, role: 'host' }] : [];
              return (
                <WttdPickHeroSlot
                  key={c}
                  label={HERO_TITLE[c]}
                  cardBackUrl={w.cardBack}
                  heroImgUrl={w.heroes[c]}
                  revealed={revealed}
                  selectedByMe={false}
                  hostHighlight={revealed}
                  disabled={!isHost}
                  onPick={() => isHost && sendAction({ type: 'wttd_host_same_set', heroClass: c })}
                  pickers={pickers}
                  myId={myId}
                />
              );
            })}
          </div>
          {isHost && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                justifyContent: 'center',
                marginTop: 16,
              }}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => sendAction({ type: 'wttd_host_same_random' })}
              >
                สุ่มฮีโร่
              </Button>
              <Button
                type="button"
                disabled={picked == null}
                onClick={() => sendAction({ type: 'wttd_host_same_go' })}
              >
                พร้อมเล่น!
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const myPref = hp.preferences[myId] ?? null;
  const myReady = hp.ready[myId] === true;
  const canPick = mode === 'normal' || mode === 'free';
  const readyPct = hp.totalPlayers > 0 ? (100 * hp.readyCount) / hp.totalPlayers : 0;

  return (
    <div className="wttd-panel">
      <div className="wttd-pick-stage">
        <h3 style={{ fontSize: '1.05rem', marginBottom: 8, textAlign: 'center' }}>เลือกฮีโร่</h3>
        <p className="wttd-pick-stage-hint">
          {mode === 'normal' &&
            'เลือกได้ซ้ำกันระหว่างเลือก — พอครบพร้อม ระบบจะมอบฮีโร่ไม่ซ้ำ (ชนกันสุ่ม)'}
          {mode === 'free' && 'เลือกได้ซ้ำกัน — ได้ตามที่เลือกทุกคน'}
        </p>
        <div className="wttd-pick-grid">
          {WTTD_HERO_CLASSES.map((c) => {
            const pickers = pickersForHero(gs.players, hp.preferences, hp.ready, c);
            const revealed = pickers.length > 0;
            const sel = myPref === c;
            return (
              <WttdPickHeroSlot
                key={c}
                label={HERO_TITLE[c]}
                cardBackUrl={w.cardBack}
                heroImgUrl={w.heroes[c]}
                revealed={revealed}
                selectedByMe={sel}
                disabled={!canPick}
                onPick={() => canPick && sendAction({ type: 'wttd_select_hero', heroClass: c })}
                pickers={pickers}
                myId={myId}
              />
            );
          })}
        </div>

        <div className="wttd-pick-ready-bar">
          <div style={{ fontSize: '0.82rem', color: 'rgb(200 195 220)', textAlign: 'center' }}>
            สถานะโต๊ะ — พร้อมแล้ว {hp.readyCount}/{hp.totalPlayers} คน
          </div>
          <div className="wttd-pick-ready-meter" aria-hidden>
            <div className="wttd-pick-ready-meter-fill" style={{ width: `${readyPct}%` }} />
          </div>
          <Button
            type="button"
            disabled={myPref == null || !canPick}
            onClick={() => sendAction({ type: 'wttd_set_ready', ready: !myReady })}
          >
            {myReady ? 'ยกเลิกการพร้อม' : 'พร้อมเล่น!'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function WttdRoleReveal({
  myHero,
  hasAcknowledged,
  progress,
  onAck,
}: {
  myHero: WttdHeroClass;
  hasAcknowledged: boolean;
  progress: { current: number; total: number };
  onAck: () => void;
}) {
  const w = imageMap.welcomeToTheDungeon;
  const equipIds = WTTD_EQUIPMENT_BY_CLASS[myHero];

  return (
    <div className="wttd-panel" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h3 style={{ fontSize: '1.05rem', marginBottom: 12, textAlign: 'center' }}>
        เปิดเผยฮีโร่ของคุณ
      </h3>
      <div className="wttd-role-hero-wrap">
        <div className="wttd-flip-perspective">
          <motion.div
            className="wttd-flip-inner"
            initial={{ rotateY: 0 }}
            animate={{ rotateY: 180 }}
            transition={{ duration: HERO_FLIP_DURATION_SEC, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="wttd-flip-face wttd-flip-face--back" aria-hidden>
              <img src={w.cardBack} alt="" className="wttd-flip-img" />
            </div>
            <div className="wttd-flip-face wttd-flip-face--front">
              <img src={w.heroes[myHero]} alt={HERO_TITLE[myHero]} className="wttd-flip-img" />
            </div>
          </motion.div>
        </div>
        <p style={{ textAlign: 'center', fontWeight: 700, marginTop: 10 }}>{HERO_TITLE[myHero]}</p>
      </div>

      <p style={{ fontSize: '0.9rem', opacity: 0.85, marginBottom: 8 }}>อุปกรณ์ของคลาสนี้</p>
      <div className="wttd-eq-reveal-grid">
        {equipIds.map((eqId, idx) => (
          <div key={eqId} className="wttd-flip-perspective">
            <motion.div
              className="wttd-flip-inner"
              initial={{ rotateY: 0 }}
              animate={{ rotateY: 180 }}
              transition={{
                delay: HERO_FLIP_DURATION_SEC * 0.35 + idx * EQ_FLIP_STAGGER_SEC,
                duration: EQ_FLIP_DURATION_SEC,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="wttd-flip-face wttd-flip-face--back" aria-hidden>
                <img src={w.cardBack} alt="" className="wttd-flip-img" />
              </div>
              <div className="wttd-flip-face wttd-flip-face--front">
                <img
                  src={w.equipment[eqId]}
                  alt=""
                  className="wttd-flip-img"
                  title={eqShortLabel(eqId)}
                />
              </div>
            </motion.div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: '0.88rem', opacity: 0.8, marginBottom: 12, textAlign: 'center' }}>
        ผู้เล่นรับทราบแล้ว {progress.current}/{progress.total} คน
      </p>
      {hasAcknowledged ? (
        <Button type="button" variant="secondary" block disabled>
          คุณรับทราบแล้ว — รอผู้อื่น…
        </Button>
      ) : (
        <Button type="button" block onClick={onAck}>
          รับทราบ — เข้าสู่เกม
        </Button>
      )}
    </div>
  );
}

export function WelcomeToTheDungeonGame({
  gameState,
  myId,
  sendAction,
  onLeave,
  onRestart,
  isHost,
}: Props) {
  const w = imageMap.welcomeToTheDungeon;
  const playHero = gameState.myHero;
  const classEquipment = WTTD_EQUIPMENT_BY_CLASS[playHero];

  const gameResult = gameState.gameResult;
  useEffect(() => {
    if (!gameResult?.winners?.length) return;
    if (!gameResult.winners.includes(myId)) return;
    const stop = startWinCelebrationLoop();
    return stop;
  }, [gameResult, myId]);

  const send = useCallback((a: WttdAction) => () => sendAction(a), [sendAction]);

  const bidding = gameState.bidding;
  const dungeonRun = gameState.dungeonRun;

  const myTurnBidding =
    bidding &&
    !bidding.pendingDraw &&
    bidding.currentTurnPlayerId === myId &&
    !gameState.awaitingDungeonEntry;
  const myPendingDraw =
    bidding?.pendingDraw && bidding.pendingDraw.playerId === myId ? bidding.pendingDraw : null;

  const explorerId = gameState.explorerId;
  const isExplorer = explorerId != null && explorerId === myId;

  const equipmentForDiscard = useMemo(() => {
    if (!myPendingDraw) return [];
    return gameState.hero.equipment;
  }, [myPendingDraw, gameState.hero.equipment]);

  /** HP สูงสุดเมื่อเข้าดันเจี้ยน = ฐานตัวละคร + โบนัสจากการ์ดอุปกรณ์ที่เหลือในชุด */
  const explorerHpMaxPreview = useMemo(
    () => wttdExplorerMaxHpFromEquipment(playHero, gameState.hero.equipment),
    [playHero, gameState.hero.equipment],
  );

  const explorerHpBonusRows = useMemo(
    () => wttdExplorerHpBonusContributors(gameState.hero.equipment),
    [gameState.hero.equipment],
  );

  /** มอนที่แพ้ทางได้จากอุปกรณ์ในชุดปัจจุบัน (พรีวิวก่อนเข้าดันเจี้ยน) */
  const passableMonsterPowers = useMemo(
    () => wttdMonsterPowersPassableWithEquipment(gameState.hero.equipment),
    [gameState.hero.equipment],
  );

  const awaitingHealRevive = Boolean(dungeonRun?.awaitingHealingPotionRevival);

  const canReveal =
    gameState.phase === 'dungeon' &&
    isExplorer &&
    dungeonRun &&
    !awaitingHealRevive &&
    dungeonRun.currentCard == null &&
    dungeonRun.resolvedCount < dungeonRun.totalCards;

  const mustResolve =
    gameState.phase === 'dungeon' &&
    isExplorer &&
    dungeonRun &&
    !awaitingHealRevive &&
    dungeonRun.currentCard != null;

  const phaseLabel = useMemo(() => {
    if (gameState.phase === 'game_over') return 'จบเกม';
    if (gameState.phase === 'hero_pick') return 'เลือกฮีโร่';
    if (gameState.phase === 'role_reveal') return 'เปิดเผยบทบาท';
    if (gameState.phase === 'bidding') return 'ประมูลดันเจี้ยน';
    return 'เข้าดันเจี้ยน';
  }, [gameState.phase]);

  const [eqZoom, setEqZoom] = useState<{ url: string; title: string } | null>(null);
  const [monsterGuideOpen, setMonsterGuideOpen] = useState(false);
  const [playerOrderOpen, setPlayerOrderOpen] = useState(true);
  const [selectedDiscardEq, setSelectedDiscardEq] = useState<WttdEquipmentId | null>(null);
  const [preDungeonModalOpen, setPreDungeonModalOpen] = useState(false);
  /** เลือกในโมดัลวอร์ปัลก่อนกด «เข้าสู่ดันเจี้ยน» (ยังไม่ส่งเซิร์ฟเวอร์จนกดปุ่ม) */
  const [vorpalPrecogModalSelection, setVorpalPrecogModalSelection] =
    useState<WttdMonsterPower | null>(null);
  const [pendingMonsterZoom, setPendingMonsterZoom] = useState<{
    url: string;
    power: WttdMonsterPower;
  } | null>(null);

  const [dungeonRoundOutcome, setDungeonRoundOutcome] = useState<WttdDungeonRoundOutcome | null>(
    null,
  );
  const dungeonExitSnapRef = useRef<{
    explorerId: string;
    name: string;
    trophies: number;
    dungeonLosses: number;
    heroClass: WttdHeroClass;
  } | null>(null);
  const prevPhaseForDungeonRef = useRef(gameState.phase);
  const dungeonRoundHandledRef = useRef(false);
  const dungeonOutcomeSeqRef = useRef(0);
  const confettiForDungeonSeqRef = useRef(-1);

  useEffect(() => {
    if (gameState.phase === 'dungeon' && gameState.explorerId) {
      dungeonRoundHandledRef.current = false;
      const p = gameState.players.find((x) => x.id === gameState.explorerId);
      if (p) {
        const heroClass = gameState.playerHero[p.id] ?? 'warrior';
        dungeonExitSnapRef.current = {
          explorerId: p.id,
          name: p.name,
          trophies: p.trophies,
          dungeonLosses: p.dungeonLosses,
          heroClass,
        };
      }
      prevPhaseForDungeonRef.current = 'dungeon';
      return;
    }

    const wasDungeon = prevPhaseForDungeonRef.current === 'dungeon';
    prevPhaseForDungeonRef.current = gameState.phase;

    if (!wasDungeon || dungeonRoundHandledRef.current) return;

    const snap = dungeonExitSnapRef.current;
    if (!snap) return;

    dungeonRoundHandledRef.current = true;
    dungeonOutcomeSeqRef.current += 1;
    const seq = dungeonOutcomeSeqRef.current;

    const heroImg = w.heroes[snap.heroClass];
    const heroTitle = HERO_TITLE[snap.heroClass];

    const p = gameState.players.find((x) => x.id === snap.explorerId);
    if (p) {
      if (p.trophies > snap.trophies) {
        setDungeonRoundOutcome({
          survived: true,
          explorerName: p.name,
          seq,
          heroImg,
          heroTitle,
        });
        return;
      }
      if (p.dungeonLosses > snap.dungeonLosses) {
        setDungeonRoundOutcome({
          survived: false,
          explorerName: p.name,
          seq,
          heroImg,
          heroTitle,
        });
        return;
      }
    } else {
      setDungeonRoundOutcome({
        survived: false,
        explorerName: snap.name,
        seq,
        heroImg,
        heroTitle,
      });
    }
  }, [gameState.phase, gameState.players, gameState.explorerId, gameState.playerHero, w]);

  useEffect(() => {
    if (!dungeonRoundOutcome?.survived) return;
    if (confettiForDungeonSeqRef.current === dungeonRoundOutcome.seq) return;
    confettiForDungeonSeqRef.current = dungeonRoundOutcome.seq;
    fireWttdDungeonRoundSurviveConfetti();
  }, [dungeonRoundOutcome]);

  useEffect(() => {
    if (!myPendingDraw) setSelectedDiscardEq(null);
  }, [myPendingDraw]);

  const prevMyPendingDraw = useRef(myPendingDraw);
  useEffect(() => {
    const hadPending = prevMyPendingDraw.current != null;
    const hasPending = myPendingDraw != null;
    if (hadPending && !hasPending) {
      setPendingMonsterZoom(null);
    }
    prevMyPendingDraw.current = myPendingDraw;
  }, [myPendingDraw]);

  const openDungeonEnter = useCallback(() => {
    if (gameState.needsVorpalPrecogBeforeDungeonEntry) {
      setVorpalPrecogModalSelection(null);
      setPreDungeonModalOpen(true);
      return;
    }
    sendAction({ type: 'dungeon_enter' });
  }, [gameState.needsVorpalPrecogBeforeDungeonEntry, sendAction]);

  const confirmVorpalPrecogAndEnterDungeon = useCallback(() => {
    if (vorpalPrecogModalSelection == null) return;
    sendAction({
      type: 'dungeon_enter',
      vorpalPrecogPower: vorpalPrecogModalSelection,
    });
    setPreDungeonModalOpen(false);
    setVorpalPrecogModalSelection(null);
  }, [sendAction, vorpalPrecogModalSelection]);

  useEffect(() => {
    if (
      !eqZoom &&
      !monsterGuideOpen &&
      !preDungeonModalOpen &&
      !pendingMonsterZoom &&
      dungeonRoundOutcome == null
    ) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEqZoom(null);
        setMonsterGuideOpen(false);
        setPreDungeonModalOpen(false);
        setVorpalPrecogModalSelection(null);
        setPendingMonsterZoom(null);
        setDungeonRoundOutcome(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [eqZoom, monsterGuideOpen, preDungeonModalOpen, pendingMonsterZoom, dungeonRoundOutcome]);

  const orderedPlayers = useMemo(() => {
    const players = gameState.players;
    const tableOrder = gameState.tableOrder;
    const byId = new Map(players.map((p) => [p.id, p]));
    const ord = tableOrder.length > 0 ? tableOrder : players.map((p) => p.id);
    return ord.map((id) => byId.get(id)).filter((p): p is (typeof players)[number] => Boolean(p));
  }, [gameState.players, gameState.tableOrder]);

  if (gameState.phase === 'game_over' && gameResult) {
    const iWon = gameResult.winners.includes(myId);
    return (
      <div className="wttd-root">
        {dungeonRoundOutcome != null && (
          <WttdDungeonRoundOutcomeOverlay
            outcome={dungeonRoundOutcome}
            onDismiss={() => setDungeonRoundOutcome(null)}
          />
        )}
        <div className="wttd-over">
          <h2>{iWon ? 'คุณชนะ!' : 'เกมจบ'}</h2>
          <p className="wttd-event">{gameResult.reason}</p>
          <div className="wttd-actions" style={{ justifyContent: 'center', marginTop: 24 }}>
            {isHost && onRestart && (
              <Button type="button" variant="secondary" onClick={onRestart}>
                <RotateCcw size={18} aria-hidden />
                เล่นใหม่
              </Button>
            )}
            <Button variant="danger" type="button" onClick={onLeave}>
              <Home size={18} aria-hidden />
              ออกจากห้อง
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.phase === 'hero_pick') {
    return (
      <div className="page container wttd-root">
        <WttdScreenHeader
          title={`Welcome to the Dungeon — ${phaseLabel}`}
          description={
            <p className="wttd-header-sub">โหมด: {MODE_LABEL[gameState.heroPickMode]}</p>
          }
          isHost={isHost}
          onRestart={onRestart}
          onLeave={onLeave}
        />
        {/* <div className="wttd-panel">
          <p className="wttd-event">{gameState.lastEvent}</p>
        </div> */}
        <WttdHeroPick gs={gameState} myId={myId} sendAction={sendAction} isHost={isHost ?? false} />
      </div>
    );
  }

  if (gameState.phase === 'role_reveal' && gameState.roleReveal) {
    const rr = gameState.roleReveal;
    return (
      <div className="page container wttd-root">
        <WttdScreenHeader
          title="Welcome to the Dungeon"
          isHost={isHost}
          onRestart={onRestart}
          onLeave={onLeave}
        />
        <WttdRoleReveal
          myHero={rr.myHero}
          hasAcknowledged={rr.hasAcknowledged}
          progress={rr.acknowledgeProgress}
          onAck={() => sendAction({ type: 'wttd_role_ack' })}
        />
      </div>
    );
  }

  const inAuctionIds = bidding?.inAuction;
  const myEqLeft =
    gameState.phase === 'bidding' && gameState.biddingEquipmentLeft
      ? gameState.biddingEquipmentLeft[myId]
      : undefined;
  const currentBidderName =
    bidding && gameState.phase === 'bidding'
      ? gameState.players.find((x) => x.id === bidding.currentTurnPlayerId)?.name
      : undefined;

  return (
    <div className="page container wttd-root">
      <WttdScreenHeader
        title="Welcome to the Dungeon"
        description={
          <p className="wttd-header-meta">
            ชนะครบ <strong>{gameState.trophiesToWin}</strong> ครั้งเพื่อชนะเกม · คุณเล่นเป็น{' '}
            <strong>{HERO_TITLE[playHero]}</strong>
          </p>
        }
        isHost={isHost}
        onRestart={onRestart}
        onLeave={onLeave}
      />

      {/* <section className="wttd-board-section">
        <div className="wttd-board-section__head">
          <h2 className="wttd-board-section__title">เหตุการณ์ล่าสุด</h2>
        </div>
        <p className="wttd-board-section__body wttd-event">{gameState.lastEvent}</p>
      </section> */}

      <section
        className={`wttd-board-section wttd-board-section--accordion${
          playerOrderOpen ? ' wttd-board-section--accordion-open' : ''
        }`}
      >
        <button
          type="button"
          className="wttd-accordion-trigger"
          id="wttd-player-order-trigger"
          aria-expanded={playerOrderOpen}
          aria-controls="wttd-player-order-panel"
          onClick={() => setPlayerOrderOpen((o) => !o)}
        >
          <span className="wttd-accordion-trigger__inner">
            <span className="wttd-accordion-trigger__text">
              <h2 className="wttd-board-section__title">ลำดับการเล่น</h2>
              <p className="wttd-board-section__meta">
                ลำดับนี้ใช้คำนวณคิวประมูล · แพ้ในดันเจี้ยน {WTTD_DUNGEON_LOSSES_TO_ELIMINATE} ครั้ง
                = ออกจากเกม
              </p>
            </span>
            <motion.span
              className="wttd-accordion-chevron"
              aria-hidden
              initial={false}
              animate={{ rotate: playerOrderOpen ? 180 : 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <ChevronDown size={22} strokeWidth={2.25} />
            </motion.span>
          </span>
        </button>
        <motion.div
          id="wttd-player-order-panel"
          role="region"
          aria-labelledby="wttd-player-order-trigger"
          aria-hidden={!playerOrderOpen}
          initial={false}
          animate={{
            height: playerOrderOpen ? 'auto' : 0,
          }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          style={{ overflow: 'hidden' }}
        >
          <div className="wttd-player-rail" role="list">
            {orderedPlayers.map((p, idx) => {
              const h = gameState.playerHero[p.id];
              const label = h ? HERO_TITLE[h] : '?';
              const isTurn =
                bidding && bidding.currentTurnPlayerId === p.id && !gameState.awaitingDungeonEntry;
              const isMe = p.id === myId;
              const stillIn = !inAuctionIds || inAuctionIds.includes(p.id);
              const eqLeft = gameState.biddingEquipmentLeft?.[p.id];
              const isExplorerPlayer = explorerId === p.id;
              const hpPct =
                gameState.phase === 'dungeon' && isExplorerPlayer && gameState.hero.hpMax > 0
                  ? (100 * gameState.hero.hp) / gameState.hero.hpMax
                  : 0;
              return (
                <div
                  key={p.id}
                  role="listitem"
                  className={`wttd-player-tile${isTurn ? ' wttd-player-tile--turn' : ''}${
                    isMe ? ' wttd-player-tile--me' : ''
                  }${!stillIn ? ' wttd-player-tile--out' : ''}${
                    ((gameState.phase === 'dungeon' && isExplorerPlayer) ||
                      (gameState.awaitingDungeonEntry && isExplorerPlayer)) &&
                    explorerId != null
                      ? ' wttd-player-tile--explorer'
                      : ''
                  }`}
                >
                  <span className="wttd-player-tile__seat" aria-hidden>
                    {idx + 1}
                  </span>
                  <div className="wttd-player-tile__main">
                    <div className="wttd-player-tile__name">
                      {p.name}
                      {isMe ? <span className="wttd-player-tile__you">คุณ</span> : null}
                    </div>
                    <div className="wttd-player-tile__hero">{label}</div>
                    <div className="wttd-player-tile__trophy" title="ชัยชนะที่เก็บได้แล้ว">
                      ชนะ {p.trophies}/{gameState.trophiesToWin}
                    </div>
                    <div
                      className={`wttd-player-tile__loss${
                        (p.dungeonLosses ?? 0) === WTTD_DUNGEON_LOSSES_TO_ELIMINATE - 1
                          ? ' wttd-player-tile__loss--warn'
                          : ''
                      }`}
                      title={`แพ้ในดันเจี้ยน ${WTTD_DUNGEON_LOSSES_TO_ELIMINATE} ครั้งจะออกจากเกม`}
                    >
                      แพ้ในดันเจี้ยน {p.dungeonLosses ?? 0}/{WTTD_DUNGEON_LOSSES_TO_ELIMINATE}
                    </div>
                    {gameState.phase === 'bidding' && eqLeft != null && (
                      <div className="wttd-player-tile__eq">อุปกรณ์เหลือ {eqLeft} ใบ</div>
                    )}
                    {gameState.phase === 'dungeon' && (
                      <div className="wttd-player-tile__hp">
                        {isExplorerPlayer ? (
                          <>
                            <span className="wttd-player-tile__hp-label">HP ผู้เข้า</span>
                            <span className="wttd-hp">
                              {gameState.hero.hp}/{gameState.hero.hpMax}
                            </span>
                            <div className="wttd-mini-hp-bar" aria-hidden>
                              <div
                                className="wttd-mini-hp-bar__fill"
                                style={{ width: `${hpPct}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <span className="wttd-player-tile__wait">รออยู่นอกดันเจี้ยน</span>
                        )}
                      </div>
                    )}
                  </div>
                  {isTurn && <span className="wttd-player-tile__badge">คิว</span>}
                </div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {(gameState.phase === 'bidding' || gameState.phase === 'dungeon') && (
        <section className="wttd-board-section wttd-board-section--dungeon-strip">
          <div className="wttd-board-section__head">
            <h2 className="wttd-board-section__title">กองดันเจี้ยน</h2>
            {bidding && (
              <p className="wttd-board-section__meta wttd-board-section__meta--tight">
                ถึงคิว:{' '}
                <strong>
                  {gameState.players.find((x) => x.id === bidding.currentTurnPlayerId)?.name}
                </strong>
              </p>
            )}
          </div>
          <div className="wttd-board-section__body wttd-board-section__body--dungeon-strip">
            <div className="wttd-dungeon-strip-scroll">
              <WttdDungeonStrip
                cardBack={w.cardBack}
                monsterByPower={w.monsterByPower}
                phase={gameState.phase}
                faceDownCountBidding={gameState.dungeonFaceDownCount}
                stackPreview={gameState.dungeonStackPreview}
                dungeonRun={gameState.dungeonRun}
              />
            </div>
            {gameState.awaitingDungeonEntry && explorerId && (
              <div className="wttd-dungeon-enter-bar">
                <p className="wttd-dungeon-enter-bar__text">
                  <strong>{gameState.players.find((p) => p.id === explorerId)?.name}</strong>{' '}
                  ชนะประมูล — กดเข้าสู่ดันเจี้ยนเพื่อเริ่มรอบ
                </p>
                {isExplorer ? (
                  <Button type="button" onClick={openDungeonEnter}>
                    เข้าสู่ดันเจี้ยน
                  </Button>
                ) : (
                  <p className="wttd-dungeon-enter-bar__wait">รอผู้เข้ากดเริ่ม…</p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="wttd-board-section">
        <div className="wttd-board-section__head wttd-board-section__head--split">
          <div className="wttd-board-section__head-text">
            <h2 className="wttd-board-section__title">ฮีโร่ &amp; สถานะโต๊ะ</h2>
            <p className="wttd-board-section__meta wttd-board-section__meta--hero">
              การ์ดด้านล่างคือชุดอุปกรณ์ใน<strong>เฟสนี้</strong> — ประมูลใช้ชุดของตัวเอง ·
              เข้าดันเจี้ยนแล้วใช้ชุดของผู้เข้าที่ชนะประมูล
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="wttd-guide-btn"
            onClick={() => setMonsterGuideOpen(true)}
          >
            <BookOpen size={17} aria-hidden />
            ไกด์มอนสเตอร์
          </Button>
        </div>
        <div className="wttd-board-section__body">
          {gameState.phase === 'bidding' && gameState.awaitingDungeonEntry && (
            <p className="wttd-await-banner">
              ประมูลจบแล้ว — ผู้ชนะใช้ปุ่ม <strong>เข้าสู่ดันเจี้ยน</strong> ที่แถบกองด้านบน
            </p>
          )}

          {gameState.phase === 'dungeon' && (
            <p className="wttd-dungeon-phase-hint">
              หน้าต่างดันเจี้ยนเต็มจอแสดง HP และการต่อสู้ — เลื่อนลงเพื่อดูอุปกรณ์ค้าง
            </p>
          )}

          <div className="wttd-hero-row">
            {gameState.phase === 'bidding' && !gameState.awaitingDungeonEntry ? (
              <div className="wttd-auction-row" aria-label="โต๊ะประมูล">
                <div className="wttd-auction-col wttd-auction-col--hero">
                  <div className="wttd-auction-hero-panel" aria-label="สถานะก่อนเข้าดันเจี้ยน">
                    <div className="wttd-auction-hero-panel__head">
                      <span className="wttd-auction-hero-panel__badge">ก่อนเข้าดันเจี้ยน</span>
                    </div>
                    <div className="wttd-auction-hero-panel__visual">
                      <div className="wttd-hero-portrait wttd-hero-portrait--card504">
                        <img src={w.heroes[playHero]} alt={HERO_TITLE[playHero]} />
                      </div>
                    </div>
                    <div className="wttd-auction-hero-panel__body">
                      <p className="wttd-auction-hero-name">{HERO_TITLE[playHero]}</p>
                      <dl className="wttd-auction-hero-dl">
                        <dt>HP เต็มตอนเข้าดันเจี้ยน</dt>
                        <dd>
                          <span className="wttd-hp">{explorerHpMaxPreview}</span>
                        </dd>
                        <dt>HP เริ่มต้น</dt>
                        <dd>{wttdExplorerBaseHp(playHero)}</dd>
                        <dt>โบนัสจากอุปกรณ์</dt>
                        <dd>
                          {explorerHpBonusRows.length === 0 ? (
                            <span className="wttd-auction-hero-muted">ไม่มี (+0)</span>
                          ) : (
                            <ul className="wttd-auction-hero-bonus-list">
                              {explorerHpBonusRows.map(({ id, bonus }) => (
                                <li key={id}>
                                  <span className="wttd-auction-hero-bonus-name">
                                    {eqShortLabel(id)}
                                  </span>
                                  <span className="wttd-auction-hero-bonus-val">+{bonus}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </dd>
                        <dt>อุปกรณ์ในชุด</dt>
                        <dd>
                          {myEqLeft ?? gameState.hero.equipment.length} / {classEquipment.length} ใบ
                        </dd>
                      </dl>
                      <div
                        className="wttd-auction-hero-passable"
                        aria-label="มอนที่แพ้ทางได้จากชุดอุปกรณ์"
                      >
                        <p className="wttd-auction-hero-passable__label">
                          สามารถปราบ (แพ้ทางจากอุปกรณ์ที่มี)
                        </p>
                        {passableMonsterPowers.length > 0 ? (
                          <ul className="wttd-auction-hero-passable__list">
                            {passableMonsterPowers.map((pow) => (
                              <li key={pow} className="wttd-auction-hero-passable__slot">
                                <button
                                  type="button"
                                  className="wttd-auction-hero-passable__hit"
                                  aria-label={`ดูการ์ดมอนพลัง ${pow} ขนาดใหญ่`}
                                  onClick={() =>
                                    setPendingMonsterZoom({
                                      url: w.monsterByPower[pow as keyof typeof w.monsterByPower],
                                      power: pow,
                                    })
                                  }
                                >
                                  <img
                                    src={w.monsterByPower[pow as keyof typeof w.monsterByPower]}
                                    alt=""
                                    className="wttd-auction-hero-passable__img"
                                  />
                                  <span className="wttd-auction-hero-passable__pow">{pow}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="wttd-auction-hero-passable__empty">
                            ยังไม่มีมอนที่แพ้ทางได้จากชุดนี้ —
                            ในเฟสดันเจี้ยนต้องรับดาเมจหรือรออุปกรณ์ที่ตรงสัญลักษณ์
                          </p>
                        )}
                      </div>
                      <div className="wttd-auction-hero-turn" role="status">
                        {myPendingDraw ? (
                          <p>คุณจั่วมอนแล้ว — ตัดสินใจที่คอลัมน์ขวา</p>
                        ) : myTurnBidding ? (
                          <p>เทิร์นคุณ — จั่วมอนหรือผ่านที่คอลัมน์ขวา</p>
                        ) : bidding ? (
                          <p>
                            รอ <strong>{currentBidderName ?? 'ผู้เล่น'}</strong> เล่น…
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="wttd-auction-col wttd-auction-col--side">
                  {myPendingDraw ? (
                    <div className="wttd-auction-monster-panel" aria-label="มอนที่จั่วได้">
                      <div className="wttd-auction-monster-panel__head">
                        <span className="wttd-auction-monster-panel__badge">
                          พลัง {myPendingDraw.power}
                        </span>
                      </div>
                      <div className="wttd-auction-monster-panel__visual">
                        <div className="wttd-auction-monster-frame">
                          <img
                            src={
                              w.monsterByPower[myPendingDraw.power as keyof typeof w.monsterByPower]
                            }
                            alt=""
                            className="wttd-auction-monster-frame__img"
                          />
                          <button
                            type="button"
                            className="wttd-auction-monster-zoom"
                            aria-label="ดูการ์ดมอนใหญ่และคำอธิบาย"
                            onClick={() =>
                              setPendingMonsterZoom({
                                url: w.monsterByPower[
                                  myPendingDraw.power as keyof typeof w.monsterByPower
                                ],
                                power: myPendingDraw.power,
                              })
                            }
                          >
                            ?
                          </button>
                        </div>
                      </div>
                      <div className="wttd-auction-monster-actions">
                        <Button type="button" onClick={send({ type: 'bidding_add_to_dungeon' })}>
                          ใส่เข้าดันเจี้ยน
                        </Button>
                        {equipmentForDiscard.length > 0 ? (
                          <>
                            <p className="wttd-auction-monster-hint">
                              เลือกการ์ดอุปกรณ์ด้านล่าง แล้วกดเอาออก
                            </p>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={!selectedDiscardEq}
                              onClick={() => {
                                if (!selectedDiscardEq) return;
                                sendAction({
                                  type: 'bidding_discard_monster',
                                  equipmentId: selectedDiscardEq,
                                });
                              }}
                            >
                              {selectedDiscardEq
                                ? `เอา ${eqShortLabel(selectedDiscardEq)} ออกจากเกม`
                                : 'เอาอุปกรณ์ออก (เลือกการ์ดก่อน)'}
                            </Button>
                          </>
                        ) : (
                          <p className="wttd-auction-monster-warn">
                            ไม่มีอุปกรณ์เหลือ — ต้องใส่มอนในดันเจี้ยน
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="wttd-auction-deck-block">
                      <WttdMonsterDeckStack
                        cardBack={w.cardBack}
                        deckRemaining={gameState.monsterDeckRemaining}
                        dungeonFaceDownCount={gameState.dungeonFaceDownCount}
                      />
                      {myTurnBidding && (
                        <div className="wttd-bidding-actions wttd-bidding-actions--under-deck">
                          <Button
                            type="button"
                            variant="danger"
                            onClick={send({ type: 'bidding_pass' })}
                          >
                            ผ่าน
                          </Button>
                          <Button type="button" onClick={send({ type: 'bidding_draw' })}>
                            จั่วมอน
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="wttd-hero-portrait wttd-hero-portrait--card504">
                  <img src={w.heroes[playHero]} alt={HERO_TITLE[playHero]} />
                </div>
                <div className="wttd-hero-stats">
                  {gameState.phase === 'dungeon' ? (
                    <>
                      <p className="wttd-hero-stats__phase">เฟสดันเจี้ยน</p>
                      <p className="wttd-hero-stats__explain">
                        รายละเอียด HP และการเล่นอยู่ในหน้าต่าง overlay ด้านบน
                      </p>
                    </>
                  ) : gameState.awaitingDungeonEntry ? (
                    <>
                      <p className="wttd-hero-stats__phase">รอเข้าดันเจี้ยน</p>
                      <p className="wttd-hero-stats__explain">
                        {isExplorer
                          ? gameState.needsVorpalPrecogBeforeDungeonEntry
                            ? 'คุณมีดาบ/มีดวอร์ปัล — กด «เข้าสู่ดันเจี้ยน» เพื่อเลือกพลังมอนเป้าหมายก่อนเข้า'
                            : 'กด «เข้าสู่ดันเจี้ยน» ที่แถบกองด้านบนเมื่อพร้อม'
                          : 'รอผู้ชนะประมูลเริ่มรอบ'}
                      </p>
                      {isExplorer && gameState.vorpalPrecogMonsterPower != null ? (
                        <p className="wttd-hero-stats__precog">
                          เป้าวอร์ปัล: พลัง <strong>{gameState.vorpalPrecogMonsterPower}</strong>
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  {gameState.dungeonStackPreview && gameState.dungeonStackPreview.length > 0 && (
                    <div className="wttd-dungeon">
                      <span className="wttd-dungeon__label">ลำดับมอน (หลังเปิดเผยในเฟสนี้):</span>
                      {gameState.dungeonStackPreview.map((pow, i) => (
                        <span key={`${i}-${pow}`} className="wttd-mon-pill">
                          {pow}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <h3 className="wttd-subhead">อุปกรณ์ของคุณในเฟสนี้</h3>
          <div className="wttd-eq-grid">
            {classEquipment.map((eqId) => {
              const has = gameState.hero.equipment.includes(eqId);
              const url = w.equipment[eqId];
              const title = eqShortLabel(eqId);
              const selectable =
                Boolean(myPendingDraw) && has && equipmentForDiscard.includes(eqId);
              const selected = selectedDiscardEq === eqId;
              return (
                <div
                  key={eqId}
                  className={`wttd-eq-slot${has ? '' : ' wttd-eq-slot--gone'}${
                    selectable ? ' wttd-eq-slot--selectable' : ''
                  }${selected ? ' wttd-eq-slot--selected' : ''}`}
                >
                  <div className="wttd-eq-card-wrap">
                    <button
                      type="button"
                      className="wttd-eq-hit"
                      disabled={!selectable}
                      onClick={() => {
                        if (!selectable) return;
                        setSelectedDiscardEq((cur) => (cur === eqId ? null : eqId));
                      }}
                    >
                      <span className="wttd-eq">
                        <img src={url} alt={title} />
                      </span>
                    </button>
                    <button
                      type="button"
                      className="wttd-eq-zoom"
                      aria-label={`ดูการ์ดใหญ่ — ${title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEqZoom({ url, title });
                      }}
                    >
                      ?
                    </button>
                  </div>
                  <span className="wttd-eq-caption">{title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {gameState.phase === 'dungeon' && dungeonRun && explorerId && (
        <WttdVersusModal
          heroTitle={HERO_TITLE[gameState.playerHero[explorerId]]}
          heroImg={w.heroes[gameState.playerHero[explorerId]]}
          equipment={gameState.hero.equipment}
          equipmentUrls={w.equipment}
          weaknessIconUrls={w.weaknessIconBySymbol}
          hp={gameState.hero.hp}
          hpMax={gameState.hero.hpMax}
          monsterImageUrlForPower={(pow) => w.monsterByPower[pow as keyof typeof w.monsterByPower]}
          isExplorer={isExplorer}
          canReveal={Boolean(canReveal)}
          mustResolve={Boolean(mustResolve)}
          currentPower={dungeonRun.currentCard}
          equipFlags={dungeonRun.equipFlags}
          vorpalPrecogMonsterPower={dungeonRun.vorpalPrecogMonsterPower}
          demonicPactBanishNextReveal={dungeonRun.demonicPactBanishNextReveal}
          combatAnimSeq={dungeonRun.combatAnimSeq}
          combatAnimKind={dungeonRun.combatAnimKind}
          combatPlayedEquipmentId={dungeonRun.combatPlayedEquipmentId}
          combatMonsterPower={dungeonRun.combatMonsterPower}
          onReveal={() => sendAction({ type: 'dungeon_reveal' })}
          onTakeDamage={() => sendAction({ type: 'dungeon_take_damage' })}
          onWeaknessPass={(eq) => sendAction({ type: 'dungeon_weakness_pass', equipmentId: eq })}
          onVorpalBlade={() => sendAction({ type: 'dungeon_use_vorpal_blade' })}
          onVorpalAxe={() => sendAction({ type: 'dungeon_use_vorpal_axe' })}
          onDemonicPact={() => sendAction({ type: 'dungeon_use_demonic_pact' })}
          onPolymorph={() => sendAction({ type: 'dungeon_use_polymorph' })}
          onRingOfPower={() => sendAction({ type: 'dungeon_use_ring_of_power' })}
          eqShort={eqShortLabel}
        />
      )}

      {gameState.phase === 'dungeon' &&
        dungeonRun?.awaitingHealingPotionRevival &&
        explorerId &&
        isExplorer && (
          <div
            className="wttd-heal-revive-lightbox"
            role="dialog"
            aria-modal
            aria-labelledby="wttd-heal-revive-title"
          >
            <div className="wttd-heal-revive-lightbox__panel">
              <h2 id="wttd-heal-revive-title" className="wttd-heal-revive-lightbox__title">
                หมดสติ — โพชันคืนชีพ
              </h2>
              <p className="wttd-heal-revive-lightbox__lead">
                ดื่มโพชันเพื่อคืนชีพที่ HP เท่าฐานคลาส ({' '}
                <strong>{wttdExplorerBaseHp(gameState.playerHero[explorerId])}</strong> )
                ไม่รวมโบนัสจากอุปกรณ์ — ใช้ได้ครั้งเดียวในรอบนี้ หรือยอมแพ้รอบ
              </p>
              <div className="wttd-heal-revive-lightbox__actions">
                <Button
                  type="button"
                  onClick={() => sendAction({ type: 'dungeon_healing_potion_revive' })}
                >
                  ดื่มโพชันคืนชีพ
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => sendAction({ type: 'dungeon_accept_death' })}
                >
                  ยอมรับความพ่ายแพ้
                </Button>
              </div>
            </div>
          </div>
        )}

      {preDungeonModalOpen && (
        <div
          className="wttd-pre-dungeon-lightbox"
          role="dialog"
          aria-modal
          aria-labelledby="wttd-pre-dungeon-title"
          onClick={() => {
            setPreDungeonModalOpen(false);
            setVorpalPrecogModalSelection(null);
          }}
        >
          <div
            className="wttd-pre-dungeon-lightbox__panel wttd-pre-dungeon-lightbox__panel--wide"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="wttd-pre-dungeon-title" className="wttd-pre-dungeon-lightbox__title">
              เลือกมอนสเตอร์เป้าหมายที่จะกำจัดเมื่อพบ
            </h2>
            <p className="wttd-pre-dungeon-lightbox__lead">
              กดการ์ดมอนเพื่อเลือก (ขึ้นขอบไฮไลต์) จากนั้นกด «เข้าสู่ดันเจี้ยน» —
              ระบบจะบันทึกเป้าวอร์ปัลและเริ่มรอบพร้อมกัน
            </p>
            <div className="wttd-pre-dungeon-lightbox__cards wttd-pre-dungeon-lightbox__cards--pick">
              {WTTD_ALL_MONSTER_POWERS.map((pow) => {
                const url = w.monsterByPower[pow as keyof typeof w.monsterByPower];
                const selected = vorpalPrecogModalSelection === pow;
                return (
                  <button
                    key={pow}
                    type="button"
                    className={`wttd-vorpal-pick${selected ? ' wttd-vorpal-pick--selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => {
                      setVorpalPrecogModalSelection((cur) => (cur === pow ? null : pow));
                    }}
                  >
                    <img src={url} alt={`พลัง ${pow}`} />
                    <span className="wttd-vorpal-pick__pow">{pow}</span>
                  </button>
                );
              })}
            </div>
            <div className="wttd-pre-dungeon-lightbox__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPreDungeonModalOpen(false);
                  setVorpalPrecogModalSelection(null);
                }}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                disabled={vorpalPrecogModalSelection == null}
                onClick={confirmVorpalPrecogAndEnterDungeon}
              >
                เข้าสู่ดันเจี้ยน
              </Button>
            </div>
          </div>
        </div>
      )}

      {pendingMonsterZoom && (
        <div
          className="wttd-mon-draw-lightbox"
          role="dialog"
          aria-modal
          aria-labelledby="wttd-mon-draw-title"
          onClick={() => setPendingMonsterZoom(null)}
        >
          <div className="wttd-mon-draw-lightbox__panel" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="wttd-mon-draw-lightbox__close"
              onClick={() => setPendingMonsterZoom(null)}
            >
              ปิด
            </button>
            <h2 id="wttd-mon-draw-title" className="wttd-mon-draw-lightbox__title">
              มอนสเตอร์ พลัง {pendingMonsterZoom.power}
            </h2>
            <div className="wttd-mon-draw-lightbox__frame">
              <img src={pendingMonsterZoom.url} alt="" />
            </div>
            <p className="wttd-mon-draw-lightbox__weak">{WTTD_MONSTER_WEAKNESS_HELP}</p>
            <div className="wttd-mon-draw-lightbox__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPendingMonsterZoom(null);
                  setMonsterGuideOpen(true);
                }}
              >
                <BookOpen size={17} aria-hidden />
                ไกด์มอนสเตอร์เต็มจอ
              </Button>
            </div>
          </div>
        </div>
      )}

      {monsterGuideOpen && (
        <div
          className="wttd-guide-lightbox"
          role="dialog"
          aria-modal
          aria-labelledby="wttd-guide-title"
          onClick={() => setMonsterGuideOpen(false)}
        >
          <div className="wttd-guide-lightbox__panel" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="wttd-guide-lightbox__close"
              onClick={() => setMonsterGuideOpen(false)}
            >
              ปิด
            </button>
            <h2 id="wttd-guide-title" className="wttd-guide-lightbox__heading">
              ไกด์พลังมอนสเตอร์
            </h2>
            <div className="wttd-guide-lightbox__frame">
              <img src={w.aide} alt="ตารางอธิบายพลังมอนสเตอร์" />
            </div>
            <div className="wttd-guide-lightbox__body">
              <p className="wttd-guide-lightbox__lead">
                อ่านค่าพลังจากภาพด้านบน — ในสำรับมีพลัง <strong>1–7</strong> และ <strong>9</strong>{' '}
                (ไม่มี พลัง 8)
              </p>
              <ul className="wttd-guide-lightbox__list">
                <li>
                  <strong>ประมูล:</strong> จั่วมอนแล้วใส่กองหรือทิ้ง
                  ถ้าทิ้งต้องเลือกเอาอุปกรณ์ออกจากเกม
                </li>
                <li>
                  <strong>ดันเจี้ยน:</strong> เปิดมอนทีละใบ — รับดาเมจเท่าพลัง
                  หรือใช้อุปกรณ์ที่สัญลักษณ์ตรงแพ้ทางเพื่อผ่านโดยไม่เสีย HP (การ์ดไม่ถูกทิ้ง)
                </li>
                <li>
                  <strong>ชนะเกม:</strong> เก็บถ้วยชัยครบ {gameState.trophiesToWin} ชิ้น ·
                  แพ้ในดันเจี้ยน {WTTD_DUNGEON_LOSSES_TO_ELIMINATE} ครั้ง = ออกจากเกม
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {dungeonRoundOutcome != null && (
        <WttdDungeonRoundOutcomeOverlay
          outcome={dungeonRoundOutcome}
          onDismiss={() => setDungeonRoundOutcome(null)}
        />
      )}

      {eqZoom && (
        <div
          className="wttd-eq-lightbox"
          role="dialog"
          aria-modal
          aria-labelledby="wttd-eq-lightbox-title"
          onClick={() => setEqZoom(null)}
        >
          <div className="wttd-eq-lightbox__panel" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="wttd-eq-lightbox__close"
              onClick={() => setEqZoom(null)}
            >
              ปิด
            </button>
            <div className="wttd-eq-lightbox__frame">
              <img src={eqZoom.url} alt={eqZoom.title} />
            </div>
            <p id="wttd-eq-lightbox-title" className="wttd-eq-lightbox__title">
              {eqZoom.title}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
