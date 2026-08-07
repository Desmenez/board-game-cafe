import type {
  ExplodingKittensAction,
  ExplodingKittensCardType,
  ExplodingKittensPlayerView,
} from 'shared';
import { Button } from '../../../components/ui';
import { CARD_LABEL } from '../lib/cardMeta';
import { EkModalCard } from './EkModalCard';
import { EkModalShell } from './EkModalShell';
import { EkTargetPlayerButton } from './EkTargetPlayerButton';

export type PlayTargetModalState =
  | { kind: 'pair'; cardIdA: string; cardIdB: string }
  | { kind: 'barking_pair'; cardIdA: string; cardIdB: string }
  | { kind: 'barking_loner_pair'; cardId: string }
  | {
      kind: 'three';
      cardIdA: string;
      cardIdB: string;
      cardIdC: string;
      step: 'target' | 'type';
      targetId?: string;
    };

type Player = ExplodingKittensPlayerView['players'][number];

type Props = {
  gs: ExplodingKittensPlayerView;
  myId: string;
  sendAction: (action: ExplodingKittensAction) => void;
  playTargetModal: PlayTargetModalState | null;
  stealPairTargets: Player[];
  aliveOpponents: Player[];
  illTakeTargetOptions: Player[];
  favorTargetOptions: Player[];
  onConfirmPair: (targetId: string) => void;
  onConfirmBarkingPair: (targetId: string) => void;
  onConfirmBarkingLoner: (targetId: string) => void;
  onConfirmThreeClaim: (targetId: string, requestedType: ExplodingKittensCardType) => void;
  onSetPlayTargetModal: (modal: PlayTargetModalState | null) => void;
};

function meSlot(gs: ExplodingKittensPlayerView, myId: string, role = 'คุณ') {
  const me = gs.players.find((p) => p.id === myId);
  return { id: myId, name: me?.name ?? 'คุณ', role };
}

function TargetList({
  players,
  emptyText,
  onPick,
}: {
  players: Player[];
  emptyText: string;
  onPick: (id: string) => void;
}) {
  if (players.length === 0) {
    return <p className="ek-modal-shell__hint">{emptyText}</p>;
  }
  return (
    <div className="ek-modal-shell__targets">
      {players.map((p) => (
        <EkTargetPlayerButton
          key={p.id}
          playerId={p.id}
          name={p.name}
          onClick={() => onPick(p.id)}
        />
      ))}
    </div>
  );
}

export function EkTargetPickModals({
  gs,
  myId,
  sendAction,
  playTargetModal,
  stealPairTargets,
  aliveOpponents,
  illTakeTargetOptions,
  favorTargetOptions,
  onConfirmPair,
  onConfirmBarkingPair,
  onConfirmBarkingLoner,
  onConfirmThreeClaim,
  onSetPlayTargetModal,
}: Props) {
  const me = meSlot(gs, myId);

  return (
    <>
      {gs.phase === 'ill_take_target' && gs.illTakePrompt && (
        <EkModalShell
          title="I'll Take That — เลือกเป้าหมาย"
          media={<EkModalCard size="hero" cardType="ill_take_that" />}
          actors={{ from: { ...me, role: 'ผู้เล่นการ์ด' } }}
          actionLine={{ label: 'แอ็กชัน', value: 'เลือกเป้าหมาย — จั่วถัดไปของเขาจะมอบให้คุณ' }}
          footer={
            <Button variant="secondary" onClick={() => sendAction({ type: 'ill_take_cancel' })}>
              ยกเลิก
            </Button>
          }
        >
          <p className="ek-modal-shell__hint">ห้ามเลือกคนที่มีการ์ดนี้อยู่หน้าแล้ว</p>
          <TargetList
            players={illTakeTargetOptions}
            emptyText="ไม่มีเป้าหมายที่เลือกได้"
            onPick={(targetId) => sendAction({ type: 'ill_take_choose_target', targetId })}
          />
        </EkModalShell>
      )}

      {gs.phase === 'favor_target' && gs.favorPrompt?.fromId === myId && (
        <EkModalShell
          title="Favor — เลือกเป้าหมาย"
          media={<EkModalCard size="hero" cardType="favor" />}
          actors={{ from: { ...me, role: 'ผู้เล่นการ์ด' } }}
          actionLine={{
            label: 'แอ็กชัน',
            value: 'เลือกคนที่มีการ์ด · แล้วคนอื่นจึง Nope/ผ่าน ได้',
          }}
        >
          <TargetList
            players={favorTargetOptions}
            emptyText="ไม่มีเป้าหมายที่มีการ์ด"
            onPick={(targetId) => sendAction({ type: 'favor_choose_target', targetId })}
          />
        </EkModalShell>
      )}

      {gs.phase === 'targeted_attack_target' && gs.targetedAttackPrompt?.fromId === myId && (
        <EkModalShell
          title="Targeted Attack — เลือกเป้าหมาย"
          media={<EkModalCard size="hero" cardType="targeted_attack" />}
          actors={{ from: { ...me, role: 'ผู้เล่นการ์ด' } }}
          actionLine={{
            label: 'แอ็กชัน',
            value: 'เป้าหมายเล่น 2 เทิร์น · แล้วคนอื่นจึง Nope/ผ่าน ได้',
          }}
        >
          <TargetList
            players={aliveOpponents}
            emptyText="ไม่มีผู้เล่นอื่น"
            onPick={(targetId) => sendAction({ type: 'targeted_attack_choose_target', targetId })}
          />
        </EkModalShell>
      )}

      {gs.phase === 'curse_target' && gs.cursePrompt && (
        <EkModalShell
          title="Curse of the Cat Butt — เลือกเป้าหมาย"
          media={<EkModalCard size="hero" cardType="curse_of_the_cat_butt" />}
          actors={{ from: { ...me, role: 'ผู้เล่นการ์ด' } }}
          actionLine={{
            label: 'แอ็กชัน',
            value: 'เป้าหมายมือบอดจนกว่าจะจั่วสำเร็จโดยไม่ระเบิด',
          }}
        >
          <TargetList
            players={aliveOpponents}
            emptyText="ไม่มีผู้เล่นอื่น"
            onPick={(targetId) => sendAction({ type: 'curse_choose_target', targetId })}
          />
        </EkModalShell>
      )}

      {gs.phase === 'mark_target' && gs.markPrompt && (
        <EkModalShell
          title="Mark — เลือกเป้าหมาย"
          media={<EkModalCard size="hero" cardType="mark" />}
          actors={{ from: { ...me, role: 'ผู้เล่นการ์ด' } }}
          actionLine={{
            label: 'แอ็กชัน',
            value: 'สุ่ม 1 ใบจากมือเป้าหมายให้โชว์หน้าออก',
          }}
        >
          <TargetList
            players={aliveOpponents.filter((p) => p.handCount > 0)}
            emptyText="ไม่มีเป้าหมายที่มีการ์ด"
            onPick={(targetId) => sendAction({ type: 'mark_choose_target', targetId })}
          />
        </EkModalShell>
      )}

      {playTargetModal?.kind === 'pair' && (
        <EkModalShell
          title="เลือกเป้าหมาย — คู่แมว"
          actors={{ from: { ...me, role: 'ผู้เล่นการ์ด' } }}
          actionLine={{ label: 'แอ็กชัน', value: 'ขโมยการ์ดสุ่ม 1 ใบจากผู้เล่นที่เลือก' }}
          footer={
            <Button variant="secondary" onClick={() => onSetPlayTargetModal(null)}>
              ยกเลิก
            </Button>
          }
        >
          <TargetList
            players={stealPairTargets}
            emptyText="ไม่มีผู้เล่นที่มีการ์ดให้ขโมย"
            onPick={onConfirmPair}
          />
        </EkModalShell>
      )}

      {playTargetModal?.kind === 'barking_pair' && (
        <EkModalShell
          title="Barking Kitten — เลือกเป้าหมาย"
          media={<EkModalCard size="hero" cardType="barking_kitten" />}
          actors={{ from: { ...me, role: 'ผู้เล่นการ์ด' } }}
          actionLine={{
            label: 'แอ็กชัน',
            value: 'เลือกผู้เล่นให้ต้อง Defuse หรือระเบิด',
          }}
          footer={
            <Button variant="secondary" onClick={() => onSetPlayTargetModal(null)}>
              ยกเลิก
            </Button>
          }
        >
          <TargetList
            players={aliveOpponents}
            emptyText="ไม่มีผู้เล่นอื่น"
            onPick={onConfirmBarkingPair}
          />
        </EkModalShell>
      )}

      {playTargetModal?.kind === 'barking_loner_pair' && (
        <EkModalShell
          title="Barking Kitten — คู่ (หน้าโต๊ะ + มือ)"
          media={<EkModalCard size="hero" cardType="barking_kitten" />}
          actors={{ from: { ...me, role: 'ผู้เล่นการ์ด' } }}
          actionLine={{
            label: 'แอ็กชัน',
            value: 'รวมการ์ดหน้าโต๊ะกับใบในมือ — เลือกผู้เล่นให้ต้อง Defuse หรือระเบิด',
          }}
          footer={
            <Button variant="secondary" onClick={() => onSetPlayTargetModal(null)}>
              ยกเลิก
            </Button>
          }
        >
          <TargetList
            players={aliveOpponents}
            emptyText="ไม่มีผู้เล่นอื่น"
            onPick={onConfirmBarkingLoner}
          />
        </EkModalShell>
      )}

      {playTargetModal?.kind === 'three' && playTargetModal.step === 'target' && (
        <EkModalShell
          title="เลือกเป้าหมาย — สามใบเหมือนกัน"
          actors={{ from: { ...me, role: 'ผู้เล่นการ์ด' } }}
          actionLine={{ label: 'แอ็กชัน', value: 'เลือกผู้เล่นที่จะเรียกการ์ดจากมือ' }}
          footer={
            <Button variant="secondary" onClick={() => onSetPlayTargetModal(null)}>
              ยกเลิก
            </Button>
          }
        >
          <TargetList
            players={aliveOpponents}
            emptyText="ไม่มีผู้เล่นอื่น"
            onPick={(targetId) =>
              onSetPlayTargetModal({ ...playTargetModal, step: 'type', targetId })
            }
          />
        </EkModalShell>
      )}

      {playTargetModal?.kind === 'three' &&
        playTargetModal.step === 'type' &&
        playTargetModal.targetId &&
        (() => {
          const target = gs.players.find((p) => p.id === playTargetModal.targetId);
          return (
            <EkModalShell
              layout="wide"
              title="เลือกการ์ดชนิดใดก็ได้"
              actors={{
                from: { ...me, role: 'ผู้เรียก' },
                to: {
                  id: playTargetModal.targetId,
                  name: target?.name ?? 'เป้าหมาย',
                  role: 'เป้าหมาย',
                },
              }}
              actionLine={{ label: 'แอ็กชัน', value: 'เรียกชนิดการ์ดจากมือเป้าหมาย' }}
              footer={
                <Button
                  variant="secondary"
                  onClick={() =>
                    onSetPlayTargetModal({
                      kind: 'three',
                      cardIdA: playTargetModal.cardIdA,
                      cardIdB: playTargetModal.cardIdB,
                      cardIdC: playTargetModal.cardIdC,
                      step: 'target',
                    })
                  }
                >
                  กลับ
                </Button>
              }
            >
              <div className="ek-modal-pick-scroll">
                <div className="ek-modal-card-grid ek-modal-card-grid--4">
                  {(Object.keys(CARD_LABEL) as ExplodingKittensCardType[]).map((wanted) => (
                    <EkModalCard
                      key={`three-claim-${wanted}`}
                      size="grid"
                      cardType={wanted}
                      onClick={() => onConfirmThreeClaim(playTargetModal.targetId!, wanted)}
                    />
                  ))}
                </div>
              </div>
            </EkModalShell>
          );
        })()}
    </>
  );
}
