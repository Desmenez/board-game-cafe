import type { SushiGoPublicPlayed } from 'shared';

type Props = {
  played: SushiGoPublicPlayed;
  title?: string;
};

export function SushiGoPlayedArea({ played, title = 'การ์ดที่เก็บ' }: Props) {
  return (
    <div className="sg-panel">
      <h2>{title}</h2>
      <div className="sg-stat-line">
        Tempura {played.tempura} · Sashimi {played.sashimi} · Dumpling {played.dumpling}
      </div>
      <div className="sg-stat-line">
        Maki {played.makiIcons} ไอคอน · Nigiri {played.nigiri} · Pudding {played.pudding}
      </div>
      <div className="sg-stat-line">
        Wasabi เปิด {played.wasabiOpen} / คู่แล้ว {played.wasabiPaired}
        {played.chopsticksAvailable > 0 ? ` · Chopsticks ${played.chopsticksAvailable}` : ''}
      </div>
    </div>
  );
}
