import type { ExplodingKittensAction, ExplodingKittensCardType, ExplodingKittensPlayerView } from 'shared';
import { Button } from '../../../components/ui';
import { CARD_IMAGE, CARD_LABEL } from '../lib/cardMeta';

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
  return (
    <>
      {gs.phase === 'ill_take_target' && gs.illTakePrompt && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>I&apos;ll Take That — เลือกเป้าหมาย</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.88rem' }}>
              จั่วถัดไปของเป้าหมายจะมอบให้คุณ · ห้ามเลือกคนที่มีการ์ดนี้อยู่หน้าแล้ว
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {illTakeTargetOptions.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>ไม่มีเป้าหมายที่เลือกได้</p>
              ) : (
                illTakeTargetOptions.map((p) => (
                  <Button
                    key={p.id}
                    variant="secondary"
                    onClick={() => sendAction({ type: 'ill_take_choose_target', targetId: p.id })}
                  >
                    {p.name}
                  </Button>
                ))
              )}
            </div>
            <div className="w-full" style={{ marginTop: 12 }}>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => sendAction({ type: 'ill_take_cancel' })}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      )}

      {gs.phase === 'favor_target' && gs.favorPrompt?.fromId === myId && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Favor — เลือกเป้าหมาย</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.88rem' }}>
              เลือกคนที่มีการ์ด · แล้วคนอื่นจึง Nope/ผ่าน ได้
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {favorTargetOptions.map((p) => (
                <Button
                  key={p.id}
                  variant="secondary"
                  onClick={() => sendAction({ type: 'favor_choose_target', targetId: p.id })}
                >
                  {p.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {gs.phase === 'targeted_attack_target' && gs.targetedAttackPrompt?.fromId === myId && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Targeted Attack — เลือกเป้าหมาย</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.88rem' }}>
              เป้าหมายเล่น 2 เทิร์น · แล้วคนอื่นจึง Nope/ผ่าน ได้
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {aliveOpponents.map((p) => (
                <Button
                  key={p.id}
                  variant="secondary"
                  onClick={() =>
                    sendAction({ type: 'targeted_attack_choose_target', targetId: p.id })
                  }
                >
                  {p.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {playTargetModal?.kind === 'pair' && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>เลือกเป้าหมาย — คู่แมว</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
              ขโมยการ์ดสุ่ม 1 ใบจากผู้เล่นที่เลือก
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {stealPairTargets.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>ไม่มีผู้เล่นที่มีการ์ดให้ขโมย</p>
              ) : (
                stealPairTargets.map((p) => (
                  <Button key={p.id} variant="secondary" onClick={() => onConfirmPair(p.id)}>
                    {p.name}
                  </Button>
                ))
              )}
            </div>
            <Button
              variant="ghost"
              block
              style={{ marginTop: 12 }}
              onClick={() => onSetPlayTargetModal(null)}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      {playTargetModal?.kind === 'barking_pair' && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Barking Kitten — เลือกเป้าหมาย</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
              เล่นคู่จากมือ — เป้าหมายมอบครึ่งมือ (ปัดขึ้น) แล้วคุณคืนจำนวนเท่ากัน (กฎใหม่)
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {aliveOpponents.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>ไม่มีผู้เล่นอื่น</p>
              ) : (
                aliveOpponents.map((p) => (
                  <Button
                    key={p.id}
                    variant="secondary"
                    onClick={() => onConfirmBarkingPair(p.id)}
                  >
                    {p.name}
                  </Button>
                ))
              )}
            </div>
            <Button
              variant="ghost"
              block
              style={{ marginTop: 12 }}
              onClick={() => onSetPlayTargetModal(null)}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      {playTargetModal?.kind === 'barking_loner_pair' && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Barking Kitten — คู่ (หน้าโต๊ะ + มือ)</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
              รวมการ์ดหน้าโต๊ะของคุณกับใบในมือ — เลือกผู้เล่นเพื่อแลกมือ (ครึ่งมือ ปัดขึ้น)
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {aliveOpponents.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>ไม่มีผู้เล่นอื่น</p>
              ) : (
                aliveOpponents.map((p) => (
                  <Button
                    key={p.id}
                    variant="secondary"
                    onClick={() => onConfirmBarkingLoner(p.id)}
                  >
                    {p.name}
                  </Button>
                ))
              )}
            </div>
            <Button
              variant="ghost"
              block
              style={{ marginTop: 12 }}
              onClick={() => onSetPlayTargetModal(null)}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      {playTargetModal?.kind === 'three' && playTargetModal.step === 'target' && (
        <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>เลือกเป้าหมาย — สามใบเหมือนกัน</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
              เลือกผู้เล่นที่จะเรียกการ์ดจากมือ
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {aliveOpponents.map((p) => (
                <Button
                  key={p.id}
                  variant="secondary"
                  onClick={() =>
                    onSetPlayTargetModal({ ...playTargetModal, step: 'type', targetId: p.id })
                  }
                >
                  {p.name}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              block
              style={{ marginTop: 12 }}
              onClick={() => onSetPlayTargetModal(null)}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      {playTargetModal?.kind === 'three' &&
        playTargetModal.step === 'type' &&
        playTargetModal.targetId && (
          <div className="modal-overlay ek-reaction-overlay" role="dialog" aria-modal="true">
            <div className="modal ek-multi-card-modal">
              <h2>เลือกการ์ดชนิดใดก็ได้</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
                จาก{' '}
                <strong>
                  {gs.players.find((p) => p.id === playTargetModal.targetId)?.name ?? 'เป้าหมาย'}
                </strong>
              </p>
              <div className="ek-modal-card-grid ek-modal-card-grid--dense ek-three-claim-type-grid">
                {(Object.keys(CARD_LABEL) as ExplodingKittensCardType[]).map((wanted) => (
                  <Button
                    key={`three-claim-${wanted}`}
                    variant="ghost"
                    className="ek-modal-card-pick-btn"
                    onClick={() => onConfirmThreeClaim(playTargetModal.targetId!, wanted)}
                  >
                    <div className="ek-modal-card-preview">
                      <img
                        src={CARD_IMAGE[wanted]}
                        alt=""
                        className="ek-card-img"
                        loading="lazy"
                        aria-hidden
                      />
                    </div>
                    <div className="ek-card-caption">{CARD_LABEL[wanted]}</div>
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                block
                style={{ marginTop: 12 }}
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
            </div>
          </div>
        )}
    </>
  );
}
