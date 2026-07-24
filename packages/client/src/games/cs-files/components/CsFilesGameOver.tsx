import { useCallback } from 'react';
import { Skull, Trophy } from 'lucide-react';
import type { CsFilesPlayerView, CsFilesRole } from 'shared';
import { getTeamForCsFilesRole } from 'shared';
import { Badge } from '../../../components/ui';
import { GameOverModal } from '../../../components/game-shell';
import { PlayerIdentity } from '../../../components/player-avatar';
import { csFilesCardUrl, csFilesRoleCardUrl } from '../../../imageMap';
import { cn } from '../../../utils/cn';
import { startWinCelebrationLoop } from '../../../utils/winCelebration';
import { CS_FILES_CARD_ASPECT_CLASS, ROLE_REVEAL_META } from '../lib/roleMeta';

type Props = {
  gameState: CsFilesPlayerView;
  onLeave: () => void;
  onRestart?: () => void;
};

function RoleRow({ playerId, name, role }: { playerId: string; name: string; role: CsFilesRole }) {
  const meta = ROLE_REVEAL_META[role];
  const team = getTeamForCsFilesRole(role);
  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-input border bg-paper-2 p-2',
        team === 'evil' ? 'border-error/45' : 'border-success/35',
      )}
    >
      <img
        src={csFilesRoleCardUrl(role)}
        alt={meta.title}
        className="h-14 w-auto rounded-sm object-cover"
      />
      <div className="min-w-0 flex-1">
        <PlayerIdentity playerId={playerId} name={name} avatarSize={28} />
        <div className="mt-1 flex flex-wrap gap-1">
          <Badge size="sm" variant={team === 'evil' ? 'danger' : 'success'}>
            {team === 'evil' ? 'ฝ่ายร้าย' : 'ฝ่ายดี'}
          </Badge>
          <Badge size="sm" variant="outline">
            {meta.title}
          </Badge>
        </div>
      </div>
    </li>
  );
}

export function CsFilesGameOver({ gameState: gs, onLeave, onRestart }: Props) {
  const reveal = gs.gameOverReveal;
  const reason = gs.gameResult?.reason ?? '';
  const goodWins = Boolean(
    gs.gameResult?.winners.some((id) => {
      const role = reveal?.roles[id];
      return role && getTeamForCsFilesRole(role) === 'good';
    }),
  );

  const startCelebration = useCallback(() => startWinCelebrationLoop(), []);

  if (!reveal || !gs.gameResult) return null;

  const solutionSeat = gs.seats.find((s) => s.id === reveal.solution.ownerId);
  const evidence = solutionSeat?.brownCards.find((c) => c.id === reveal.solution.evidenceCardId);
  const means = solutionSeat?.blueCards.find((c) => c.id === reveal.solution.meansCardId);

  const winners = gs.players.filter((p) => {
    const role = reveal.roles[p.id];
    return role && gs.gameResult!.winners.includes(p.id);
  });
  const losers = gs.players.filter((p) => {
    const role = reveal.roles[p.id];
    return role && !gs.gameResult!.winners.includes(p.id);
  });

  return (
    <GameOverModal
      titleId="cs-files-game-over-title"
      onLeave={onLeave}
      onRestart={onRestart}
      startCelebration={startCelebration}
      panelClassName={cn(goodWins ? 'border-success/50' : 'border-error/50')}
    >
      <header className="mb-5 text-center">
        <div
          className={cn(
            'mx-auto mb-2 flex size-12 items-center justify-center rounded-full',
            goodWins ? 'bg-success/15 text-success' : 'bg-error/15 text-error',
          )}
        >
          {goodWins ? <Trophy size={28} /> : <Skull size={28} />}
        </div>
        <p className="text-xs tracking-wide text-ink-3 uppercase">เกมจบแล้ว</p>
        <h2 id="cs-files-game-over-title" className="font-display text-2xl font-bold text-ink">
          {goodWins ? 'ฝ่ายนักสืบชนะ' : 'ฝ่ายฆาตกรชนะ'}
        </h2>
        <p className="mt-2 text-sm text-ink-2">{reason}</p>
      </header>

      {(evidence || means) && (
        <section className="mb-5 rounded-card border border-rule bg-paper-3 p-4">
          <h3 className="mb-3 text-center text-sm font-semibold text-ink">คำตอบของคดี</h3>
          <div className="flex flex-wrap items-end justify-center gap-4">
            {evidence ? (
              <figure className="min-w-0 max-w-30 text-center">
                <img
                  src={csFilesCardUrl(evidence.publicId, evidence.version)}
                  alt={evidence.label}
                  className={cn(
                    CS_FILES_CARD_ASPECT_CLASS,
                    'w-full rounded-sm border border-amber-700/50 object-cover',
                  )}
                />
                <figcaption className="mt-1.5 text-xs text-ink-2">
                  หลักฐาน · {evidence.label}
                </figcaption>
              </figure>
            ) : null}
            {means ? (
              <figure className="min-w-0 max-w-30 text-center">
                <img
                  src={csFilesCardUrl(means.publicId, means.version)}
                  alt={means.label}
                  className={cn(
                    CS_FILES_CARD_ASPECT_CLASS,
                    'w-full rounded-sm border border-sky-700/50 object-cover',
                  )}
                />
                <figcaption className="mt-1.5 text-xs text-ink-2">
                  วิธีฆ่า · {means.label}
                </figcaption>
              </figure>
            ) : null}
          </div>
          <p className="mt-3 text-center text-sm text-ink-2">
            เจ้าของการ์ด: <strong className="text-ink">{solutionSeat?.name ?? '—'}</strong>
          </p>
        </section>
      )}

      <section className="mb-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-success">
          <Trophy size={16} aria-hidden /> ฝ่ายชนะ
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {winners.map((p) => {
            const role = reveal.roles[p.id] as CsFilesRole;
            return <RoleRow key={p.id} playerId={p.id} name={p.name} role={role} />;
          })}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-error">
          <Skull size={16} aria-hidden /> ฝ่ายแพ้
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {losers.map((p) => {
            const role = reveal.roles[p.id] as CsFilesRole;
            return <RoleRow key={p.id} playerId={p.id} name={p.name} role={role} />;
          })}
        </ul>
      </section>
    </GameOverModal>
  );
}
