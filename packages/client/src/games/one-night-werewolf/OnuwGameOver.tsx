import { useState } from 'react';
import type { OnuwPlayerView, OnuwRole, OnuwTeam } from 'shared';
import { ONUW_ROLE_DESCRIPTION_TH, onuwTeamForRole } from 'shared';
import { Button, Dialog, DialogDescription, DialogFooter, DialogTitle } from '../../components/ui';
import { onuwCardBackUrl, onuwRoleCardUrl } from '../../imageMap';
import { ROLE_LABEL_EN, ROLE_LABEL_TH, TEAM_LABEL_TH } from './onuwRoles';

type OnuwMorningRosterRow = NonNullable<OnuwPlayerView['morningRoster']>[number];

function sortMorningRowsForGameOver(rows: OnuwMorningRosterRow[]): OnuwMorningRosterRow[] {
  return [...rows].sort((a, b) => {
    const rc = ROLE_LABEL_TH[a.role].localeCompare(ROLE_LABEL_TH[b.role], 'th');
    if (rc !== 0) return rc;
    return a.name.localeCompare(b.name, 'th');
  });
}

export function OnuwGameOverSection({ gs }: { gs: OnuwPlayerView }) {
  const [roleDetailCard, setRoleDetailCard] = useState<{ role: OnuwRole; artKey: string } | null>(
    null,
  );

  const result = gs.gameResult!;
  const roster = gs.morningRoster ?? [];
  const forfeit =
    result.reason.includes('ไม่ทำแอ็กชันกลางคืน') || result.reason.includes('หมดเวลาโหวต');

  const wolfRows = roster.filter((r) => onuwTeamForRole(r.role) === 'werewolf_team');
  const villageRows = roster.filter((r) => onuwTeamForRole(r.role) !== 'werewolf_team');

  const winnerSet = new Set(result.winners);
  const primaryWinnerTeam: OnuwTeam | null =
    result.winners.length === 0
      ? null
      : (() => {
          const w0 = result.winners[0];
          const row = roster.find((x) => x.playerId === w0);
          return row ? onuwTeamForRole(row.role) : null;
        })();

  const sectionOrder: OnuwTeam[] =
    primaryWinnerTeam === 'werewolf_team'
      ? ['werewolf_team', 'village_team']
      : ['village_team', 'werewolf_team'];

  const winnerNames = result.winners.map(
    (id) =>
      roster.find((r) => r.playerId === id)?.name ??
      gs.players.find((p) => p.id === id)?.name ??
      id,
  );

  return (
    <>
      <section className="onuw-stage card onuw-game-over">
        <h2 className="text-center text-4xl! font-bold">จบเกม</h2>

        {forfeit ? (
          <div className="onuw-forfeit-banner" role="alert">
            <strong>เกมจบก่อนกำหนด</strong>
            <p>{result.reason}</p>
          </div>
        ) : (
          <p className="onuw-game-over-reason">
            <strong>{result.reason}</strong>
          </p>
        )}

        <div className="onuw-game-over-hero">
          <p className="onuw-game-over-hero-kicker">ผู้ชนะ</p>
          {result.winners.length > 0 ? (
            <p className="onuw-game-over-hero-names">{winnerNames.join(' · ')}</p>
          ) : (
            <p className="onuw-game-over-hero-names onuw-game-over-hero-names--none">ไม่มีผู้ชนะ</p>
          )}
        </div>

        <div className="onuw-game-over-teams">
          {sectionOrder.map((team) => {
            const rows = team === 'werewolf_team' ? wolfRows : villageRows;
            const won = primaryWinnerTeam === team;
            const gridRows = sortMorningRowsForGameOver(rows);
            const title = team === 'werewolf_team' ? 'ทีมมนุษย์หมาป่า' : 'ทีมหมู่บ้าน';
            return (
              <section
                key={team}
                className={`onuw-game-over-team onuw-game-over-team--${team === 'werewolf_team' ? 'wolves' : 'village'}${won ? ' onuw-game-over-team--won' : ''}`}
              >
                <header className="onuw-game-over-team-head">
                  <h3 className="onuw-game-over-team-title">{title}</h3>
                  {won ? <span className="onuw-game-over-won-badge">ชนะ</span> : null}
                </header>
                {gridRows.length === 0 ? (
                  <p className="onuw-game-over-empty">ไม่มีผู้เล่นในทีมนี้</p>
                ) : (
                  <div className="onuw-game-over-team-grid">
                    {gridRows.map((m) => (
                      <div key={m.playerId} className="onuw-game-over-player-cell">
                        <div className="onuw-game-over-player-card-visual">
                          <button
                            type="button"
                            className="onuw-card-help-btn onuw-game-over-card-help-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoleDetailCard({ role: m.role, artKey: m.artKey });
                            }}
                            aria-label={`คำอธิบาย ${ROLE_LABEL_TH[m.role]}`}
                          >
                            ?
                          </button>
                          <div className="onuw-game-over-player-card-frame">
                            <img
                              src={onuwRoleCardUrl(m.artKey)}
                              alt=""
                              className="onuw-game-over-player-card-img"
                              decoding="async"
                            />
                          </div>
                        </div>
                        <span className="onuw-game-over-player-role-label">
                          {ROLE_LABEL_TH[m.role]}
                        </span>
                        <span
                          className={
                            winnerSet.has(m.playerId)
                              ? 'onuw-game-over-player-name onuw-game-over-player-name--winner'
                              : 'onuw-game-over-player-name'
                          }
                        >
                          {m.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {gs.revealEliminations.length > 0 || gs.hunterShotReveals.length > 0 ? (
          <div className="onuw-game-over-events">
            <h4 className="onuw-game-over-events-title">เหตุการณ์ระหว่างเกม</h4>
            <div className="onuw-game-over-event-grid">
              {gs.revealEliminations.map((rev) => (
                <div key={`vote-${rev.playerId}`} className="onuw-game-over-event-card">
                  <p className="onuw-game-over-event-kind">ถูกโหวตออก</p>
                  <p className="onuw-game-over-event-player">
                    {gs.players.find((p) => p.id === rev.playerId)?.name ?? rev.playerId}
                  </p>
                  <div className="onuw-game-over-event-visual">
                    <button
                      type="button"
                      className="onuw-card-help-btn onuw-game-over-card-help-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoleDetailCard({ role: rev.role, artKey: rev.artKey });
                      }}
                      aria-label={`คำอธิบาย ${ROLE_LABEL_TH[rev.role]}`}
                    >
                      ?
                    </button>
                    <img
                      src={onuwRoleCardUrl(rev.artKey)}
                      alt=""
                      className="onuw-game-over-event-img"
                      decoding="async"
                    />
                  </div>
                  <span className="onuw-game-over-event-role">{ROLE_LABEL_TH[rev.role]}</span>
                </div>
              ))}
              {gs.hunterShotReveals.map((rev) => (
                <div key={`hunt-${rev.playerId}`} className="onuw-game-over-event-card">
                  <p className="onuw-game-over-event-kind">ถูก Hunter ยิง</p>
                  <p className="onuw-game-over-event-player">
                    {gs.players.find((p) => p.id === rev.playerId)?.name ?? rev.playerId}
                  </p>
                  <div className="onuw-game-over-event-visual">
                    <button
                      type="button"
                      className="onuw-card-help-btn onuw-game-over-card-help-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoleDetailCard({ role: rev.role, artKey: rev.artKey });
                      }}
                      aria-label={`คำอธิบาย ${ROLE_LABEL_TH[rev.role]}`}
                    >
                      ?
                    </button>
                    <img
                      src={onuwRoleCardUrl(rev.artKey)}
                      alt=""
                      className="onuw-game-over-event-img"
                      decoding="async"
                    />
                  </div>
                  <span className="onuw-game-over-event-role">{ROLE_LABEL_TH[rev.role]}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <Dialog
        open={roleDetailCard !== null}
        onOpenChange={(open) => {
          if (!open) setRoleDetailCard(null);
        }}
        contentClassName={
          roleDetailCard !== null
            ? `modal onuw-role-detail-dialog onuw-role-detail-dialog--${onuwTeamForRole(roleDetailCard.role)}`
            : 'modal onuw-role-detail-dialog'
        }
        aria-labelledby="onuw-game-over-role-detail-title"
      >
        {roleDetailCard !== null ? (
          <>
            <div className="onuw-role-detail-heading">
              <span
                className={`onuw-role-detail-team onuw-role-detail-team--${onuwTeamForRole(roleDetailCard.role)}`}
              >
                {TEAM_LABEL_TH[onuwTeamForRole(roleDetailCard.role)]}
              </span>
              <DialogTitle id="onuw-game-over-role-detail-title" className="onuw-role-detail-title">
                {ROLE_LABEL_TH[roleDetailCard.role]}
              </DialogTitle>
              <p className="onuw-role-detail-title-en">{ROLE_LABEL_EN[roleDetailCard.role]}</p>
            </div>
            <div className="onuw-role-detail-body">
              <img
                src={
                  roleDetailCard.artKey ? onuwRoleCardUrl(roleDetailCard.artKey) : onuwCardBackUrl()
                }
                alt=""
                className="onuw-role-detail-img"
              />
              <DialogDescription className="onuw-role-detail-desc">
                {ONUW_ROLE_DESCRIPTION_TH[roleDetailCard.role]}
              </DialogDescription>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setRoleDetailCard(null)}>
                ปิด
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </Dialog>
    </>
  );
}
