import type { CodenamesAction, CodenamesCardView, CodenamesPlayerView } from 'shared';
import { cn } from '../../../utils/cn';
import { CN_CARD_ROLE_LABEL } from '../art';

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

export function CodenamesBoard({
  view,
  canGuess,
  myPendingGuessCardIndex,
  pendingGuessNamesByCard,
  send,
}: Props) {
  return (
    <section className="cn-board" aria-label="กระดาน Codenames">
      {view.cards.map((card) => {
        const votes = pendingGuessNamesByCard.get(card.index);
        const knownRole = card.revealedRole ?? card.roleHint;
        return (
          <button
            key={card.index}
            type="button"
            className={cn(
              'cn-card',
              cardToneClass(card),
              view.consensusGuessCardIndex === card.index && 'is-consensus',
              myPendingGuessCardIndex === card.index && 'is-my-pick',
            )}
            disabled={!canGuess || card.revealed}
            aria-label={
              knownRole ? `${card.word} · ${CN_CARD_ROLE_LABEL[knownRole]}` : card.word
            }
            onClick={() => send({ type: 'select_guess', cardIndex: card.index })}
          >
            <span className="cn-card__word">{card.word}</span>
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
