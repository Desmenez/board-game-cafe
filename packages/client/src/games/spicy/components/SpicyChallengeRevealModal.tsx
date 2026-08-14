import {
  spicyDeclareLabelTh,
  spicySpiceLabelTh,
  type SpicyChallengeReveal,
  type SpicyPublicSeat,
} from 'shared';
import { GameCardActionModal } from '../../../components/game-shell';
import { PlayerIdentity } from '../../../components/player-avatar';
import { Button } from '../../../components/ui';
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

export function SpicyChallengeRevealModal({ reveal, seats, myId, canAck, onAck }: Props) {
  const won = reveal.challengerWon;
  const challengerName = seatName(seats, reveal.challengerId, 'ผู้ท้า');
  const challengedName = seatName(seats, reveal.challengedId, 'ผู้ถูกท้า');
  const challengerLabel = `${challengerName}${reveal.challengerId === myId ? ' (คุณ)' : ''}`;
  const challengedLabel = `${challengedName}${reveal.challengedId === myId ? ' (คุณ)' : ''}`;

  const declared = spicyDeclareLabelTh(reveal.declaration);
  const actual = spicyCardLabelTh(reveal.revealed);

  return (
    <GameCardActionModal
      open
      onOpenChange={() => undefined}
      dismissible={false}
      titleId="spicy-challenge-reveal-title"
      descriptionId="spicy-challenge-reveal-desc"
      title={won ? 'ท้าถูก!' : 'ท้าผิด'}
      description={
        won
          ? `${traitLabelTh(reveal.trait)} — ผู้ท้าชนะ การประกาศไม่ตรงกับการ์ด`
          : `${traitLabelTh(reveal.trait)} — ผู้ท้าแพ้ การประกาศตรงกับการ์ดที่เปิด`
      }
      cardSrc={spicyCardFaceUrl(reveal.revealed)}
      cardAlt={actual}
      cardAspectRatio="331 / 514"
      contentClassName={won ? 'spicy-reveal-modal--won' : 'spicy-reveal-modal--lost'}
      actors={
        <>
          <PlayerIdentity
            playerId={reveal.challengerId}
            name={challengerLabel}
            avatarSize={36}
            secondary={won ? 'ผู้ท้าชนะ' : 'ผู้ท้าแพ้'}
          />
          <PlayerIdentity
            playerId={reveal.challengedId}
            name={challengedLabel}
            avatarSize={36}
            secondary={`ประกาศ ${declared}`}
          />
        </>
      }
      footer={
        canAck ? (
          <Button type="button" className="w-full min-h-[2.65rem] font-bold" onClick={onAck}>
            ต่อไป
          </Button>
        ) : (
          <p className="m-0 w-full text-center text-sm text-[var(--text-secondary)]">
            รอผู้เล่นกดต่อไป…
          </p>
        )
      }
    >
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
    </GameCardActionModal>
  );
}
