import {
  spicyDeclareLabelTh,
  spicySpiceLabelTh,
  type SpicyChallengeReveal,
  type SpicyPublicSeat,
} from 'shared';
import { PlayerIdentity } from '../../../components/player-avatar';
import { Button, Dialog } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { spicyCardFaceUrl, spicyCardLabelTh } from '../art';

type Props = {
  reveal: SpicyChallengeReveal;
  seats: SpicyPublicSeat[];
  myId: string;
  canAck: boolean;
  onAck: () => void;
};

function seatName(seats: SpicyPublicSeat[], id: string, fallback: string) {
  return seats.find((s) => s.id === id)?.name ?? fallback;
}

function traitLabelTh(trait: SpicyChallengeReveal['trait']): string {
  switch (trait) {
    case 'number':
      return 'ท้าเลข';
    case 'spice':
      return 'ท้าเครื่องเทศ';
    case 'both':
      return 'ท้า Copy Cat';
  }
}

function actualFaceTh(reveal: SpicyChallengeReveal): string {
  return spicyCardLabelTh(reveal.revealed);
}

export function SpicyChallengeRevealModal({ reveal, seats, myId, canAck, onAck }: Props) {
  const won = reveal.challengerWon;
  const challengerName = seatName(seats, reveal.challengerId, 'ผู้ท้า');
  const challengedName = seatName(seats, reveal.challengedId, 'ผู้ถูกท้า');
  const challengerLabel = `${challengerName}${reveal.challengerId === myId ? ' (คุณ)' : ''}`;
  const challengedLabel = `${challengedName}${reveal.challengedId === myId ? ' (คุณ)' : ''}`;

  const declared = spicyDeclareLabelTh(reveal.declaration);
  const actual = actualFaceTh(reveal);

  return (
    <Dialog
      open
      onOpenChange={() => {}}
      dismissible={false}
      aria-labelledby="spicy-challenge-reveal-title"
      overlayClassName="room-night-dialog-overlay"
      contentClassName={cn(
        'spicy-reveal-modal room-night-dialog rounded-card border border-rule bg-paper-2 text-ink',
        won ? 'spicy-reveal-modal--won' : 'spicy-reveal-modal--lost',
      )}
    >
      <header className="spicy-reveal-modal__header">
        <p className="spicy-reveal-modal__kicker">{traitLabelTh(reveal.trait)}</p>
        <h2 id="spicy-challenge-reveal-title" className="spicy-reveal-modal__title">
          {won ? 'ท้าถูก!' : 'ท้าผิด!'}
        </h2>
        <p className="spicy-reveal-modal__lead">
          {won ? 'ประกาศไม่ตรงกับการ์ดที่เปิด' : 'ประกาศตรงกับการ์ดที่เปิด'}
        </p>
      </header>

      <div className="spicy-reveal-actors" aria-label="ใครท้าใคร">
        <div className="spicy-reveal-actors__actor">
          <span className="spicy-reveal-actors__role">ผู้ท้า</span>
          <PlayerIdentity
            playerId={reveal.challengerId}
            name={challengerLabel}
            avatarSize={44}
            secondary={won ? 'ชนะการท้า' : 'แพ้การท้า'}
          />
        </div>
        <span className="spicy-reveal-actors__arrow" aria-hidden>
          →
        </span>
        <div className="spicy-reveal-actors__actor">
          <span className="spicy-reveal-actors__role">ผู้ถูกท้า</span>
          <PlayerIdentity
            playerId={reveal.challengedId}
            name={challengedLabel}
            avatarSize={44}
            secondary={`ประกาศ ${declared}`}
          />
        </div>
      </div>

      <div className="spicy-reveal-modal__stage">
        <div className="spicy-reveal-modal__card-wrap">
          <img
            src={spicyCardFaceUrl(reveal.revealed)}
            alt={actual}
            className="spicy-reveal-modal__card"
            width={331}
            height={514}
          />
        </div>

        <div className="spicy-reveal-compare" aria-label="เปรียบเทียบประกาศกับการ์ดจริง">
          <div className="spicy-reveal-compare__row">
            <span className="spicy-reveal-compare__label">ประกาศ</span>
            <span className="spicy-reveal-compare__value">{declared}</span>
          </div>
          <div className="spicy-reveal-compare__row spicy-reveal-compare__row--actual">
            <span className="spicy-reveal-compare__label">เปิดได้</span>
            <span className="spicy-reveal-compare__value">{actual}</span>
          </div>
          <p className="spicy-reveal-compare__note">
            {reveal.trait === 'number'
              ? `ท้าว่าเลขไม่ใช่ ${reveal.declaration.number}`
              : reveal.trait === 'spice'
                ? `ท้าว่าไม่ใช่ ${spicySpiceLabelTh(reveal.declaration.spice)}`
                : 'ท้าว่าประกาศไม่ตรงทั้งเลขและเครื่องเทศ'}
          </p>
        </div>
      </div>

      <div className="spicy-reveal-modal__actions">
        {canAck ? (
          <Button type="button" className="spicy-reveal-modal__ack" onClick={onAck}>
            ต่อไป
          </Button>
        ) : (
          <p className="spicy-reveal-modal__wait">รอผู้เล่นกดต่อไป…</p>
        )}
      </div>
    </Dialog>
  );
}
