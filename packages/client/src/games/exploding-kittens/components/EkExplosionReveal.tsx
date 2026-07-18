import type { ExplodingKittensPlayerView } from 'shared';
import { ExplosionGif } from './ExplosionGif';

type Props = {
  reveal: NonNullable<ExplodingKittensPlayerView['explosionReveal']>;
};

export function EkExplosionReveal({ reveal }: Props) {
  return (
    <div className="ek-explosion-overlay" role="dialog" aria-modal="true">
      <ExplosionGif />
      <div className="ek-explosion-caption">
        <h2 className="ek-explosion-title">💥 EXPLODING KITTEN!</h2>
        <p className="ek-explosion-sub">
          <strong>{reveal.playerName}</strong> จั่วการ์ดระเบิด!
        </p>
        <p className="ek-explosion-note">
          {reveal.hasDefuse ? 'ต้องกดใช้ Defuse' : 'ถ้าไม่มี Defuse จะตายทันที'}
        </p>
      </div>
    </div>
  );
}
