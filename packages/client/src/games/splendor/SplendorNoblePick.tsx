import type { SplendorNobleView } from 'shared';
import { SplendorNobleTile } from './SplendorNobleTile';

type Props = {
  nobles: SplendorNobleView[];
  optionIds: string[];
  onChoose: (nobleId: string) => void;
};

export function SplendorNoblePick({ nobles, optionIds, onChoose }: Props) {
  const eligible = nobles.filter((n) => optionIds.includes(n.id));

  return (
    <section className="card splendor-noble-pick" aria-label="เลือกโนเบิล">
      <h3>เลือกโนเบิล 1 คน</h3>
      <div className="splendor-nobles splendor-nobles--pick">
        {eligible.map((n) => (
          <SplendorNobleTile
            key={n.id}
            noble={n}
            selectable
            onClick={() => onChoose(n.id)}
          />
        ))}
      </div>
    </section>
  );
}
