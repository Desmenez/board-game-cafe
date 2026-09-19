import type { CodenamesAction, CodenamesCardView, CodenamesPlayerView } from 'shared';
import { cn } from '../../../utils/cn';
import { CN_CARD_ROLE_LABEL, cnCardRoleArtSrc, cnPictureCardSrc } from '../art';

type Props = {
  view: CodenamesPlayerView;
  canGuess: boolean;
  myPendingGuessCardIndex: number | undefined;
  pendingGuessNamesByCard: Map<number, Array<{ id: string; name: string }>>;
  send: (action: CodenamesAction) => void;
};

function cardToneClass(card: CodenamesCardView): string {
  const role = card.revealedRole ?? card.roleHint;
  if (card.revealed) {
    if (role === 'red') return 'is-red';
    if (role === 'blue') return 'is-blue';
    if (role === 'assassin') return 'is-assassin';
    return 'is-neutral';
  }
  return role ? `hint-${role}` : '';
}

function cardAriaLabel(card: CodenamesCardView, pictures: boolean): string {
  const name = pictures ? card.word || `รูปที่ ${card.index + 1}` : card.word;
  const knownRole = card.revealedRole ?? card.roleHint;
  return knownRole ? `${name} · ${CN_CARD_ROLE_LABEL[knownRole]}` : name;
}

export function CodenamesBoard({
  view,
  canGuess,
  myPendingGuessCardIndex,
  pendingGuessNamesByCard,
  send,
}: Props) {
  const pictures = view.boardVariant === 'pictures';

  return (
    <section
      className={cn('cn-board', pictures && 'cn-board--pictures')}
      aria-label={pictures ? 'กระดาน Codenames Pictures' : 'กระดาน Codenames'}
    >
      {view.cards.map((card) => {
        const votes = pendingGuessNamesByCard.get(card.index);
        const knownRole = card.revealedRole ?? card.roleHint;
        const pictureSrc =
          pictures && card.imageKey ? cnPictureCardSrc(card.imageKey, card.imageUrl) : '';
        const overlaySrc = card.revealed && knownRole ? cnCardRoleArtSrc(knownRole) : '';
        return (
          <button
            key={card.index}
            type="button"
            className={cn(
              'cn-card',
              pictures && 'cn-card--picture',
              cardToneClass(card),
              view.consensusGuessCardIndex === card.index && 'is-consensus',
              myPendingGuessCardIndex === card.index && 'is-my-pick',
            )}
            disabled={!canGuess || card.revealed}
            aria-label={cardAriaLabel(card, pictures)}
            onClick={() => send({ type: 'select_guess', cardIndex: card.index })}
          >
            {pictures && pictureSrc ? (
              <img className="cn-card__art" src={pictureSrc} alt="" draggable={false} />
            ) : (
              <span className="cn-card__word">{card.word}</span>
            )}
            {pictures && knownRole === 'assassin' ? (
              <span className="cn-card__spy-badge">SPY</span>
            ) : null}
            {overlaySrc ? (
              <img className="cn-card__role-overlay" src={overlaySrc} alt="" draggable={false} />
            ) : null}
            {votes?.length ? (
              <span className="cn-card__votes">
                {votes.map((vote) => (
                  <span key={vote.id} className="cn-card__vote-name">
                    {vote.name}
                  </span>
                ))}
              </span>
            ) : null}
          </button>
        );
      })}
    </section>
  );
}
