import type { Flip7Action } from 'shared';
import { Button } from '../../../components/ui';

type Props = {
  canAct: boolean;
  meActive: boolean;
  blockHitStayPendingSc: boolean;
  myForcedDrawRemaining: number;
  sendAction: (action: Flip7Action) => void;
};

export function Flip7ActionBar({
  canAct,
  meActive,
  blockHitStayPendingSc,
  myForcedDrawRemaining,
  sendAction,
}: Props) {
  return (
    <div className="f7-action-bar" role="region" aria-label="แอคชันหลัก">
      <div className="f7-action-bar__inner">
        <Button
          type="button"
          size="lg"
          onClick={() => sendAction({ type: 'hit' } satisfies Flip7Action)}
          disabled={!canAct || blockHitStayPendingSc}
        >
          {myForcedDrawRemaining > 0 ? `Hit (${myForcedDrawRemaining})` : 'Hit'}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          onClick={() => sendAction({ type: 'stay' } satisfies Flip7Action)}
          disabled={!canAct || !meActive || blockHitStayPendingSc || myForcedDrawRemaining > 0}
        >
          Stay
        </Button>
      </div>
    </div>
  );
}
