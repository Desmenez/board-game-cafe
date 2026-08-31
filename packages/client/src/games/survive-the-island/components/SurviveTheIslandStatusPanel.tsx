import type {
  SurviveTheIslandAbility,
  SurviveTheIslandCreatureKind,
  SurviveTheIslandPlayerView,
  SurviveTheIslandTerrain,
} from 'shared';
import { motion, useReducedMotion } from 'motion/react';
import { GamePhasePanel } from '../../../components/game-shell';
import { PlayerIdentity } from '../../../components/player-avatar';
import { Button } from '../../../components/ui';
import {
  STI_ABILITY_LABEL,
  STI_CREATURE_LABEL,
  STI_TERRAIN_LABEL,
  stiAbilitySrc,
  stiAdventurerSrc,
  stiArt,
  stiCreatureSrc,
  stiTerrainSrc,
} from '../art';
import {
  StiAbilityButton,
  StiAdventurerToken,
  StiHexArt,
  StiMeter,
  StiPhaseChip,
  StiToken,
} from './SurviveTheIslandTokens';

type PublicAdventurer = SurviveTheIslandPlayerView['adventurers'][number];
type PublicRaft = SurviveTheIslandPlayerView['rafts'][number];

type Props = {
  view: SurviveTheIslandPlayerView;
  myId: string;
  isMyTurn: boolean;
  selectedAdventurerId: string | null;
  selectedRaftId: string | null;
  selectedCreatureId: string | null;
  selectedAbility: SurviveTheIslandAbility | null;
  selectedCanBeRescued: boolean;
  sinkingTerrain: SurviveTheIslandTerrain | null;
  unplacedAdventurers: PublicAdventurer[];
  selectedSetupAdventurerId: string | null;
  myUnplacedRaft: PublicRaft | undefined;
  onSelectSetupAdventurer: (adventurerId: string) => void;
  showDevTools: boolean;
  onDevAutoPlaceAdventurers: () => void;
  onSelectAbility: (ability: SurviveTheIslandAbility) => void;
  onFinishAction: () => void;
  onRescue: () => void;
  onRollCreature: () => void;
  rollingCreatureDie: boolean;
  rollingCreatureFace: SurviveTheIslandCreatureKind | null;
  movableCreatureCount: number;
  selectedCreatureHasDestinations: boolean;
};

function creatureMovePrompt(
  kind: SurviveTheIslandCreatureKind,
  selectedCreatureId: string | null,
  movableCreatureCount: number,
  selectedCreatureHasDestinations: boolean,
): string {
  const label = STI_CREATURE_LABEL[kind];
  if (movableCreatureCount === 0) return `${label}ขยับไม่ได้ — ไม่มีช่องปลายทาง`;
  if (selectedCreatureId && !selectedCreatureHasDestinations)
    return `ตัวนี้ขยับไม่ได้ — เลือก${label}ตัวอื่น`;
  if (kind === 'kaiju') {
    return selectedCreatureId
      ? `คลิกช่องน้ำหรือเกาะปลายทางสำหรับ${label}`
      : `คลิก${label}บนกระดาน แล้วเลือกช่องน้ำหรือเกาะปลายทาง`;
  }
  return selectedCreatureId
    ? `คลิกช่องน้ำปลายทางสำหรับ${label}`
    : `คลิก${label}บนกระดาน แล้วเลือกช่องน้ำปลายทาง`;
}

function promptForAction(props: Props): string {
  const {
    view,
    selectedAbility,
    selectedRaftId,
    selectedAdventurerId,
    selectedCreatureId,
    selectedCanBeRescued,
    movableCreatureCount,
    selectedCreatureHasDestinations,
  } = props;
  if (!view.canAct) return 'รอผู้เล่นปัจจุบันเลือกเดิน';
  if (view.pendingCreatureDie) {
    return creatureMovePrompt(
      view.pendingCreatureDie.kind,
      selectedCreatureId,
      movableCreatureCount,
      selectedCreatureHasDestinations,
    );
  }
  if (selectedAbility === 'paddle') {
    return selectedRaftId ? 'เลือกช่องน้ำปลายทาง (ไกลได้ 2 ช่อง)' : 'เลือกแพที่จะพาย';
  }
  if (selectedAbility === 'dolphin') {
    return selectedAdventurerId ? 'เลือกช่องน้ำหรือเกาะปลายทาง' : 'เลือกผจญภัยที่กำลังว่ายน้ำ';
  }
  if (selectedAbility === 'dive') {
    return selectedCreatureId ? 'เลือกช่องน้ำว่างเพื่อย้ายสัตว์' : 'เลือกสัตว์ที่จะย้าย';
  }
  if (selectedAbility === 'repellent') return 'เลือกฉลามหรือไคจูที่อยู่กับผจญภัยของคุณ';
  if (selectedRaftId) return 'เลือกช่องน้ำที่ติดกันและว่าง';
  if (selectedAdventurerId) {
    if (selectedCanBeRescued) return 'กด «ขึ้น Rescue Island» เพื่อขึ้นเกาะ';
    return 'เลือกเกาะที่ติดกัน หรือกระโดดลงน้ำที่ติดเกาะ';
  }
  return 'เลือกผจญภัยหรือแพของคุณ แล้วเลือกช่องปลายทาง';
}

export function SurviveTheIslandStatusPanel({
  view,
  myId,
  isMyTurn,
  selectedAdventurerId,
  selectedRaftId,
  selectedCreatureId,
  selectedAbility,
  selectedCanBeRescued,
  sinkingTerrain,
  unplacedAdventurers,
  selectedSetupAdventurerId,
  myUnplacedRaft,
  onSelectSetupAdventurer,
  showDevTools,
  onDevAutoPlaceAdventurers,
  onSelectAbility,
  onFinishAction,
  onRescue,
  onRollCreature,
  rollingCreatureDie,
  rollingCreatureFace,
  movableCreatureCount,
  selectedCreatureHasDestinations,
}: Props) {
  const reduceMotion = useReducedMotion();
  const active = view.players.find((player) => player.id === view.activePlayerId);
  const selected = selectedAdventurerId
    ? view.adventurers.find((item) => item.id === selectedAdventurerId)
    : null;
  const selectedRaft = selectedRaftId
    ? view.rafts.find((item) => item.id === selectedRaftId)
    : null;
  const selectedCreature = selectedCreatureId
    ? view.creatures.find((item) => item.id === selectedCreatureId)
    : null;
  const selectedTreasure =
    selected && view.myAdventurerTreasures[selected.id] != null
      ? view.myAdventurerTreasures[selected.id]
      : null;
  const unplacedAdventurerGroups = [
    ...unplacedAdventurers
      .reduce((groups, adventurer) => {
        const treasure = view.myAdventurerTreasures[adventurer.id] ?? null;
        const key = `${adventurer.color}:${treasure ?? 'unknown'}`;
        const group = groups.get(key) ?? { color: adventurer.color, treasure, adventurers: [] };
        group.adventurers.push(adventurer);
        groups.set(key, group);
        return groups;
      }, new Map<string, { color: string; treasure: number | null; adventurers: PublicAdventurer[] }>())
      .values(),
  ].sort(
    (left, right) =>
      (left.treasure ?? Infinity) - (right.treasure ?? Infinity) ||
      left.color.localeCompare(right.color),
  );
  const promptArt =
    selectedAbility != null
      ? { src: stiAbilitySrc(selectedAbility), hex: true, alt: STI_ABILITY_LABEL[selectedAbility] }
      : selected
        ? { src: stiAdventurerSrc(selected.color), hex: false, alt: 'ผจญภัย' }
        : selectedRaft
          ? { src: stiArt.tokens.raft, hex: false, alt: 'แพ' }
          : selectedCreature
            ? {
                src: stiCreatureSrc(selectedCreature.kind),
                hex: false,
                alt: STI_CREATURE_LABEL[selectedCreature.kind],
              }
            : view.phase === 'setup_adventurers' && unplacedAdventurers.length
              ? { src: stiAdventurerSrc(unplacedAdventurers[0].color), hex: false, alt: 'ผจญภัย' }
              : view.phase === 'setup_rafts'
                ? { src: stiArt.tokens.raft, hex: false, alt: 'แพ' }
                : view.phase === 'rising_waters' && sinkingTerrain
                  ? {
                      src: stiTerrainSrc(sinkingTerrain),
                      hex: true,
                      alt: STI_TERRAIN_LABEL[sinkingTerrain],
                    }
                  : view.phase === 'action' && view.pendingCreatureDie
                    ? {
                        src: stiCreatureSrc(view.pendingCreatureDie.kind),
                        hex: false,
                        alt: STI_CREATURE_LABEL[view.pendingCreatureDie.kind],
                      }
                    : view.phase === 'creatures' && view.creatureToMove
                      ? {
                          src: stiCreatureSrc(view.creatureToMove),
                          hex: false,
                          alt: STI_CREATURE_LABEL[view.creatureToMove],
                        }
                      : view.phase === 'creatures'
                        ? { src: stiArt.abilities.creatureDie, hex: true, alt: 'ลูกเต๋าสัตว์ทะเล' }
                        : { src: stiArt.abilities.paddle, hex: true, alt: 'แอ็กชัน' };

  const description =
    view.phase === 'setup_adventurers'
      ? view.canAct
        ? selectedSetupAdventurerId
          ? 'คลิกเกาะว่างเพื่อวางผจญภัยที่เลือก'
          : 'เลือกผจญภัย 1 ตัวก่อน แล้วคลิกเกาะว่าง'
        : 'รอผู้เล่นอื่นวางผจญภัย'
      : view.phase === 'setup_rafts'
        ? view.canAct
          ? 'คลิกช่องน้ำสีทองเพื่อวางแพ 1 ลำ'
          : 'รอผู้เล่นอื่นวางแพ'
        : view.phase === 'rising_waters'
          ? view.canAct
            ? `เลือกแผ่น${sinkingTerrain ? STI_TERRAIN_LABEL[sinkingTerrain] : 'ชายหาด'}ที่เรืองแสง แล้วทอย Creature die (${view.risingWatersSunk}/${view.risingWatersTilesToSink} แผ่น)`
            : 'รอผู้เล่นปัจจุบันเลือกเกาะให้จม'
          : view.phase === 'creatures'
            ? view.canAct
              ? view.creatureToMove
                ? creatureMovePrompt(
                    view.creatureToMove,
                    selectedCreatureId,
                    movableCreatureCount,
                    selectedCreatureHasDestinations,
                  )
                : 'ทอยลูกเต๋าเพื่อสุ่มสัตว์ทะเล'
              : 'รอผู้เล่นปัจจุบันขยับสัตว์ทะเล'
            : promptForAction({
                view,
                myId,
                isMyTurn,
                selectedAdventurerId,
                selectedRaftId,
                selectedCreatureId,
                selectedAbility,
                selectedCanBeRescued,
                sinkingTerrain,
                unplacedAdventurers,
                selectedSetupAdventurerId,
                myUnplacedRaft,
                onSelectSetupAdventurer,
                showDevTools,
                onDevAutoPlaceAdventurers,
                onSelectAbility,
                onFinishAction,
                onRescue,
                onRollCreature,
                rollingCreatureDie,
                rollingCreatureFace,
                movableCreatureCount,
                selectedCreatureHasDestinations,
              });

  return (
    <aside className="z-10 space-y-3 self-center max-lg:static lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-contain">
      <section className="card space-y-3 p-3">
        <div className="flex items-center gap-2">
          {active ? (
            <PlayerIdentity
              playerId={active.id}
              name={active.name}
              avatarSize={40}
              secondary={isMyTurn ? 'ตาของคุณ' : 'กำลังเล่น'}
              className="min-w-0 flex-1"
            />
          ) : null}
          <StiPhaseChip phase={view.phase} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <StiMeter
            src={stiArt.effects.volcano}
            hex
            filled={view.volcanoesRevealed}
            total={3}
            label="ภูเขาไฟที่เปิดแล้ว"
          />
          {view.phase === 'action' ? (
            <StiMeter
              src={stiArt.abilities.paddle}
              hex
              filled={view.movesRemaining}
              total={3}
              label="การเดินที่เหลือ"
            />
          ) : null}
        </div>
      </section>

      <GamePhasePanel
        density="compact"
        title={
          <span className="inline-flex items-center gap-2">
            {promptArt.hex ? (
              <StiHexArt src={promptArt.src} alt="" size="md" />
            ) : (
              <StiToken src={promptArt.src} alt="" size="md" />
            )}
            <span>{promptArt.alt}</span>
          </span>
        }
        description={description}
        actionsPlacement="footer"
        actions={
          view.phase === 'action' &&
          view.canAct &&
          !view.pendingCreatureDie &&
          !view.pendingRepellent ? (
            <>
              {selectedCanBeRescued ? (
                <Button onClick={onRescue} className="inline-flex items-center gap-2">
                  <StiToken src={stiArt.tokens.raft} alt="" size="xs" />
                  ขึ้น Rescue Island
                </Button>
              ) : null}
              <Button variant="secondary" onClick={onFinishAction}>
                จบแอ็กชัน
              </Button>
            </>
          ) : view.phase === 'creatures' &&
            view.canAct &&
            !view.creatureToMove &&
            !view.pendingRepellent ? (
            <Button
              disabled={rollingCreatureDie}
              onClick={onRollCreature}
              className="inline-flex items-center gap-2"
            >
              <StiHexArt src={stiArt.abilities.creatureDie} alt="" size="xs" className="w-7" />
              {rollingCreatureDie ? 'กำลังทอย…' : 'ทอยลูกเต๋า'}
            </Button>
          ) : view.phase === 'rising_waters' && view.canAct && !view.pendingRepellent ? (
            <Button
              disabled={view.risingWatersSunk < view.risingWatersTilesToSink || rollingCreatureDie}
              onClick={onRollCreature}
              className="inline-flex items-center gap-2"
            >
              <StiHexArt src={stiArt.abilities.creatureDie} alt="" size="xs" className="w-7" />
              {rollingCreatureDie ? 'กำลังทอย…' : 'ทอย Creature die'}
            </Button>
          ) : undefined
        }
      >
        {rollingCreatureFace ? (
          <div
            className="mb-3 flex flex-col items-center gap-2 rounded-xl border border-amber-200/35 bg-amber-100/5 p-3"
            role="status"
            aria-live="polite"
            aria-label="กำลังทอย Creature die"
          >
            <motion.div
              className="grid h-24 w-24 place-items-center"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      rotate: [0, -12, 15, -8, 0],
                      y: [0, -12, 0, -5, 0],
                      scale: [1, 1.08, 0.97, 1.04, 1],
                    }
              }
              transition={{ duration: 0.42, ease: 'linear', repeat: Infinity }}
            >
              <motion.img
                key={rollingCreatureFace}
                className="h-full w-full object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.5)]"
                src={stiCreatureSrc(rollingCreatureFace)}
                alt=""
                initial={reduceMotion ? false : { opacity: 0.35, rotateY: 90, scale: 0.82 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                transition={{ duration: 0.1 }}
              />
            </motion.div>
            <p className="text-xs font-semibold text-amber-100">กำลังทอย Creature die…</p>
          </div>
        ) : null}
        {(selected && view.phase === 'action') ||
        (selectedRaft && view.phase === 'action') ||
        selectedCreature ||
        (view.phase === 'action' && view.myAbilities.length) ||
        (view.phase === 'setup_adventurers' && unplacedAdventurers.length) ||
        (view.phase === 'setup_rafts' && myUnplacedRaft) ||
        (view.phase === 'rising_waters' && sinkingTerrain) ? (
          <div className="space-y-3">
            {selected && view.phase === 'action' ? (
              <div className="flex items-center gap-3 rounded-lg border border-pear/35 bg-paper-3 p-2">
                <StiAdventurerToken color={selected.color} treasure={selectedTreasure} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">ผจญภัยที่เลือก</p>
                  <p className="text-xs text-ink-2">
                    {selected.aboardRaftId
                      ? 'อยู่บนแพ'
                      : selected.waterSpaceId
                        ? 'กำลังว่ายน้ำ'
                        : 'อยู่บนเกาะ'}
                  </p>
                </div>
              </div>
            ) : null}

            {selectedRaft && view.phase === 'action' && !selected ? (
              <div className="flex items-center gap-3 rounded-lg border border-pear/35 bg-paper-3 p-2">
                <StiToken src={stiArt.tokens.raft} alt="" size="lg" />
                <p className="text-sm font-semibold text-ink">แพที่เลือก</p>
              </div>
            ) : null}

            {selectedCreature ? (
              <div className="flex items-center gap-3 rounded-lg border border-pear/35 bg-paper-3 p-2">
                <StiToken src={stiCreatureSrc(selectedCreature.kind)} alt="" size="lg" />
                <p className="text-sm font-semibold text-ink">
                  {STI_CREATURE_LABEL[selectedCreature.kind]}
                </p>
              </div>
            ) : null}

            {view.phase === 'action' && view.myAbilities.length ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-ink-2">ความสามารถของคุณ</p>
                <div className="flex flex-wrap gap-1.5">
                  {view.myAbilities.map((ability, index) => (
                    <StiAbilityButton
                      key={`${ability}-${index}`}
                      ability={ability}
                      selected={selectedAbility === ability}
                      disabled={
                        !view.canAct ||
                        view.pendingCreatureDie != null ||
                        view.pendingRepellent != null
                      }
                      onClick={() => onSelectAbility(ability)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {view.phase === 'setup_adventurers' && unplacedAdventurers.length ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-ink-2">เลือกผจญภัยที่จะวาง</p>
                <div className="flex flex-wrap gap-2">
                  {unplacedAdventurerGroups.map(({ color, treasure, adventurers }) => {
                    const adventurer = adventurers[0]!;
                    const isSelected = adventurer.id === selectedSetupAdventurerId;
                    return (
                      <button
                        key={`${color}:${treasure ?? 'unknown'}`}
                        type="button"
                        disabled={!view.canAct}
                        aria-pressed={isSelected}
                        aria-label={`เลือกผจญภัยสมบัติ ${treasure ?? 'ไม่ทราบค่า'} เหลือ ${adventurers.length} ตัว`}
                        onClick={() => onSelectSetupAdventurer(adventurer.id)}
                        className={`flex flex-col items-center rounded-lg border p-1 transition-colors ${
                          isSelected
                            ? 'border-pear bg-pear/15'
                            : 'border-rule bg-paper-3 hover:border-pear/45 hover:bg-paper-4'
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <StiAdventurerToken color={adventurer.color} treasure={treasure} />
                        <span className="text-xs font-semibold tabular-nums text-ink-2">
                          ×{adventurers.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-ink-2">
                  {selectedSetupAdventurerId
                    ? 'เลือกแล้ว — คลิก Island tile ว่างเพื่อวาง'
                    : 'เลือก 1 ตัวก่อนวาง'}
                </p>
                {showDevTools ? (
                  <section className="rounded-lg border border-dashed border-amber-300/50 bg-amber-100/5 p-2">
                    <p className="text-[11px] font-semibold tracking-wide text-amber-100">
                      DEV · TEST SETUP
                    </p>
                    <p className="mt-0.5 text-xs text-ink-2">
                      สุ่มวาง Adventurer ที่เหลือของทุกคน แล้วเข้าสู่การวางแพ
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={onDevAutoPlaceAdventurers}
                    >
                      สุ่มวาง Adventurer ทั้งหมด
                    </Button>
                  </section>
                ) : null}
              </div>
            ) : null}

            {view.phase === 'setup_rafts' && myUnplacedRaft ? (
              <div className="flex items-center gap-2">
                <StiToken src={stiArt.tokens.raft} alt="" size="lg" />
                <p className="text-xs text-ink-2">แพที่ยังไม่ได้วาง</p>
              </div>
            ) : null}

            {view.phase === 'rising_waters' && sinkingTerrain ? (
              <div className="flex items-center gap-3">
                <StiHexArt src={stiTerrainSrc(sinkingTerrain)} alt="" size="lg" />
                <p className="text-xs text-ink-2">
                  {view.legalSinkTileIds.length} แผ่น{STI_TERRAIN_LABEL[sinkingTerrain]}ให้เลือก
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </GamePhasePanel>
    </aside>
  );
}
