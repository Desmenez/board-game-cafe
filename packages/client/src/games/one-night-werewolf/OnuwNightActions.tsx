import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OnuwAction, OnuwPlayerView } from 'shared';
import { Button } from '../../components/ui';
import { ROLE_LABEL_TH } from './onuwRoles';
import { OnuwNightCenterPickGrid, OnuwNightPlayerPickGrid } from './OnuwNightPickers';

export function OnuwNightActions({
  gs,
  myId,
  sendAction,
}: {
  gs: OnuwPlayerView;
  myId: string;
  sendAction: (action: OnuwAction) => void;
}) {
  const kind = gs.currentNightKind;
  const actors = gs.nightActors ?? [];
  const [seerMode, setSeerMode] = useState<'player' | 'center'>('player');
  const [peekPlayer, setPeekPlayer] = useState('');
  const [centerA, setCenterA] = useState<0 | 1 | 2>(0);
  const [centerB, setCenterB] = useState<0 | 1 | 2>(1);
  const [robberTgt, setRobberTgt] = useState('');
  const [tmA, setTmA] = useState('');
  const [tmB, setTmB] = useState('');
  const [doppelTgt, setDoppelTgt] = useState('');
  const [drunkC, setDrunkC] = useState<0 | 1 | 2>(0);
  const [wolfC, setWolfC] = useState<0 | 1 | 2>(0);
  const [nightSubmitLocked, setNightSubmitLocked] = useState(false);

  const others = useMemo(() => gs.players.filter((p) => p.id !== myId), [gs.players, myId]);
  const isActor = gs.phase === 'night' && kind != null && actors.includes(myId);

  const doppelPeekSecret = gs.nightSecretView?.kind === 'doppel_peek' ? gs.nightSecretView : null;
  const doppelNeedsInstantFollowUp =
    kind === 'doppelganger' &&
    doppelPeekSecret != null &&
    (doppelPeekSecret.sawRole === 'seer' ||
      doppelPeekSecret.sawRole === 'robber' ||
      doppelPeekSecret.sawRole === 'troublemaker' ||
      doppelPeekSecret.sawRole === 'drunk');

  const submitNightAction = useCallback(
    (action: OnuwAction) => {
      if (nightSubmitLocked) return;
      setNightSubmitLocked(true);
      sendAction(action);
    },
    [nightSubmitLocked, sendAction],
  );

  useEffect(() => {
    if (!isActor) setNightSubmitLocked(false);
  }, [isActor]);

  useEffect(() => {
    setNightSubmitLocked(false);
  }, [
    gs.nightStepIndex,
    gs.currentNightKind,
    doppelPeekSecret?.targetName,
    doppelPeekSecret?.sawRole,
  ]);

  useEffect(() => {
    if (!nightSubmitLocked) return;
    const id = window.setTimeout(() => setNightSubmitLocked(false), 4000);
    return () => window.clearTimeout(id);
  }, [nightSubmitLocked]);

  if (!isActor || !kind) return null;

  const lock = nightSubmitLocked;

  if (kind === 'doppelganger') {
    if (doppelNeedsInstantFollowUp && doppelPeekSecret) {
      const fr = doppelPeekSecret.sawRole;
      if (fr === 'seer') {
        return (
          <div className="onuw-night-actions">
            <p className="onuw-night-actions-label">
              คุณก็อปเป็นหมอดู — ทำแอ็กชันหมอดูในขั้นนี้ (จะไม่ตื่นซ้ำในขั้นหมอดู)
            </p>
            <div className="onuw-night-mode-row">
              <Button
                type="button"
                variant={seerMode === 'player' ? 'primary' : 'secondary'}
                disabled={lock}
                onClick={() => setSeerMode('player')}
              >
                ดูผู้เล่น 1 คน
              </Button>
              <Button
                type="button"
                variant={seerMode === 'center' ? 'primary' : 'secondary'}
                disabled={lock}
                onClick={() => setSeerMode('center')}
              >
                ดูกลาง 2 ใบ
              </Button>
            </div>
            {seerMode === 'player' ? (
              <>
                <p className="onuw-night-actions-label">เลือกผู้เล่นหนึ่งคน</p>
                <OnuwNightPlayerPickGrid
                  players={others}
                  selectedId={peekPlayer}
                  onSelect={setPeekPlayer}
                  disabled={lock}
                />
                <Button
                  type="button"
                  disabled={!peekPlayer || lock}
                  onClick={() =>
                    submitNightAction({ type: 'night_seer_peek_player', targetId: peekPlayer })
                  }
                >
                  ดูการ์ด
                </Button>
              </>
            ) : (
              <>
                <p className="onuw-night-actions-label">เลือกการ์ดกลางสองช่องที่ต่างกัน</p>
                <p className="onuw-night-sub-label">ช่องแรก</p>
                <OnuwNightCenterPickGrid value={centerA} onChange={setCenterA} disabled={lock} />
                <p className="onuw-night-sub-label">ช่องที่สอง</p>
                <OnuwNightCenterPickGrid value={centerB} onChange={setCenterB} disabled={lock} />
                <Button
                  type="button"
                  disabled={centerA === centerB || lock}
                  onClick={() =>
                    submitNightAction({
                      type: 'night_seer_peek_center',
                      indexA: centerA,
                      indexB: centerB,
                    })
                  }
                >
                  ดูการ์ดกลาง
                </Button>
              </>
            )}
          </div>
        );
      }
      if (fr === 'robber') {
        return (
          <div className="onuw-night-actions">
            <p className="onuw-night-actions-label">
              คุณก็อปเป็นโจร — เลือกสลับการ์ดในขั้นนี้ (จะไม่ตื่นซ้ำในขั้นโจร)
            </p>
            <OnuwNightPlayerPickGrid
              players={others}
              selectedId={robberTgt}
              onSelect={setRobberTgt}
              disabled={lock}
            />
            <Button
              type="button"
              disabled={!robberTgt || lock}
              onClick={() => submitNightAction({ type: 'night_robber_swap', targetId: robberTgt })}
            >
              สลับการ์ด
            </Button>
          </div>
        );
      }
      if (fr === 'troublemaker') {
        const othersMinusA = tmA ? others.filter((p) => p.id !== tmA) : others;
        return (
          <div className="onuw-night-actions">
            <p className="onuw-night-actions-label">
              คุณก็อปเป็นคนสร้างปัญหา — เลือกสองคนในขั้นนี้ (จะไม่ตื่นซ้ำในขั้นนั้น)
            </p>
            <p className="onuw-night-sub-label">คนที่ 1</p>
            <OnuwNightPlayerPickGrid
              players={others}
              selectedId={tmA}
              disabled={lock}
              onSelect={(id) => {
                setTmA(id);
                if (tmB === id) setTmB('');
              }}
            />
            <p className="onuw-night-sub-label">คนที่ 2</p>
            <OnuwNightPlayerPickGrid
              players={othersMinusA}
              selectedId={tmB}
              onSelect={setTmB}
              disabled={lock}
            />
            <Button
              type="button"
              disabled={!tmA || !tmB || tmA === tmB || lock}
              onClick={() =>
                submitNightAction({
                  type: 'night_troublemaker_swap',
                  playerAId: tmA,
                  playerBId: tmB,
                })
              }
            >
              สลับการ์ดของทั้งสองคน
            </Button>
          </div>
        );
      }
      if (fr === 'drunk') {
        return (
          <div className="onuw-night-actions">
            <p className="onuw-night-actions-label">
              คุณก็อปเป็นคนเมา — เลือกการ์ดกลางในขั้นนี้ (จะไม่ตื่นซ้ำในขั้นคนเมา)
            </p>
            <OnuwNightCenterPickGrid value={drunkC} onChange={setDrunkC} disabled={lock} />
            <Button
              type="button"
              disabled={lock}
              onClick={() =>
                submitNightAction({ type: 'night_drunk_take_center', centerIndex: drunkC })
              }
            >
              สลับกับการ์ดกลาง
            </Button>
          </div>
        );
      }
    }

    return (
      <div className="onuw-night-actions">
        <p className="onuw-night-actions-label">แตะผู้เล่นหนึ่งคนเพื่อดูการ์ดของเขา</p>
        <OnuwNightPlayerPickGrid
          players={others}
          selectedId={doppelTgt}
          onSelect={setDoppelTgt}
          disabled={lock}
        />
        <Button
          type="button"
          disabled={!doppelTgt || lock}
          onClick={() => submitNightAction({ type: 'night_doppel_peek', targetId: doppelTgt })}
        >
          ดูการ์ด
        </Button>
      </div>
    );
  }

  if (kind === 'werewolf') {
    if (gs.nightWolfIsPack === true) {
      return (
        <div className="onuw-night-actions">
          <Button
            type="button"
            disabled={lock}
            onClick={() => submitNightAction({ type: 'night_ack' })}
          >
            ยืนยัน — ดูเพื่อนแล้ว
          </Button>
        </div>
      );
    }
    if (gs.nightWolfIsPack === false) {
      return (
        <div className="onuw-night-actions">
          <p className="onuw-night-actions-label">เลือกการ์ดกลาง 1 ใบที่จะเปิดดู</p>
          <OnuwNightCenterPickGrid value={wolfC} onChange={setWolfC} disabled={lock} />
          <Button
            type="button"
            disabled={lock}
            onClick={() =>
              submitNightAction({ type: 'night_wolf_peek_center', centerIndex: wolfC })
            }
          >
            เปิดการ์ดกลาง
          </Button>
        </div>
      );
    }
    return null;
  }

  if (kind === 'minion' || kind === 'mason' || kind === 'insomniac') {
    return (
      <div className="onuw-night-actions">
        <Button
          type="button"
          disabled={lock}
          onClick={() => submitNightAction({ type: 'night_ack' })}
        >
          ยืนยัน
        </Button>
      </div>
    );
  }

  if (kind === 'seer') {
    return (
      <div className="onuw-night-actions">
        <div className="onuw-night-mode-row">
          <Button
            type="button"
            variant={seerMode === 'player' ? 'primary' : 'secondary'}
            disabled={lock}
            onClick={() => setSeerMode('player')}
          >
            ดูผู้เล่น 1 คน
          </Button>
          <Button
            type="button"
            variant={seerMode === 'center' ? 'primary' : 'secondary'}
            disabled={lock}
            onClick={() => setSeerMode('center')}
          >
            ดูกลาง 2 ใบ
          </Button>
        </div>
        {seerMode === 'player' ? (
          <>
            <p className="onuw-night-actions-label">เลือกผู้เล่นหนึ่งคน</p>
            <OnuwNightPlayerPickGrid
              players={others}
              selectedId={peekPlayer}
              onSelect={setPeekPlayer}
              disabled={lock}
            />
            <Button
              type="button"
              disabled={!peekPlayer || lock}
              onClick={() =>
                submitNightAction({ type: 'night_seer_peek_player', targetId: peekPlayer })
              }
            >
              ดูการ์ด
            </Button>
          </>
        ) : (
          <>
            <p className="onuw-night-actions-label">เลือกการ์ดกลางสองช่องที่ต่างกัน</p>
            <p className="onuw-night-sub-label">ช่องแรก</p>
            <OnuwNightCenterPickGrid value={centerA} onChange={setCenterA} disabled={lock} />
            <p className="onuw-night-sub-label">ช่องที่สอง</p>
            <OnuwNightCenterPickGrid value={centerB} onChange={setCenterB} disabled={lock} />
            <Button
              type="button"
              disabled={centerA === centerB || lock}
              onClick={() =>
                submitNightAction({
                  type: 'night_seer_peek_center',
                  indexA: centerA,
                  indexB: centerB,
                })
              }
            >
              ดูการ์ดกลาง
            </Button>
          </>
        )}
      </div>
    );
  }

  if (kind === 'robber') {
    return (
      <div className="onuw-night-actions">
        <p className="onuw-night-actions-label">เลือกผู้เล่นหนึ่งคนเพื่อสลับการ์ด</p>
        <OnuwNightPlayerPickGrid
          players={others}
          selectedId={robberTgt}
          onSelect={setRobberTgt}
          disabled={lock}
        />
        <Button
          type="button"
          disabled={!robberTgt || lock}
          onClick={() => submitNightAction({ type: 'night_robber_swap', targetId: robberTgt })}
        >
          สลับการ์ด
        </Button>
      </div>
    );
  }

  if (kind === 'troublemaker') {
    const othersMinusA = tmA ? others.filter((p) => p.id !== tmA) : others;
    return (
      <div className="onuw-night-actions">
        <p className="onuw-night-actions-label">เลือกผู้เล่นสองคน (ไม่รวมคุณ)</p>
        <p className="onuw-night-sub-label">คนที่ 1</p>
        <OnuwNightPlayerPickGrid
          players={others}
          selectedId={tmA}
          disabled={lock}
          onSelect={(id) => {
            setTmA(id);
            if (tmB === id) setTmB('');
          }}
        />
        <p className="onuw-night-sub-label">คนที่ 2</p>
        <OnuwNightPlayerPickGrid
          players={othersMinusA}
          selectedId={tmB}
          onSelect={setTmB}
          disabled={lock}
        />
        <Button
          type="button"
          disabled={!tmA || !tmB || tmA === tmB || lock}
          onClick={() =>
            submitNightAction({
              type: 'night_troublemaker_swap',
              playerAId: tmA,
              playerBId: tmB,
            })
          }
        >
          สลับการ์ดของทั้งสองคน
        </Button>
      </div>
    );
  }

  if (kind === 'drunk') {
    return (
      <div className="onuw-night-actions">
        <p className="onuw-night-actions-label">เลือกการ์ดกลางหนึ่งใบเพื่อสลับกับการ์ดของคุณ</p>
        <OnuwNightCenterPickGrid value={drunkC} onChange={setDrunkC} disabled={lock} />
        <Button
          type="button"
          disabled={lock}
          onClick={() =>
            submitNightAction({ type: 'night_drunk_take_center', centerIndex: drunkC })
          }
        >
          สลับกับการ์ดกลาง
        </Button>
      </div>
    );
  }

  return null;
}
