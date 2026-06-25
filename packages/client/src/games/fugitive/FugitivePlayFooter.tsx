import { Button } from '../../components/ui';
import { formatReachableLabel, type StagingState, tryStageHideout } from './fugitivePlacement';

type HeaderProps = {
  lastHideoutValue: number;
  staging: StagingState;
  hideoutsRequiredThisStep: number;
};

type ActionsProps = {
  lastHideoutValue: number;
  staging: StagingState;
  canPass: boolean;
  onConfirm: () => void;
  onPass: () => void;
};

export function FugitivePlayHeader({
  lastHideoutValue,
  staging,
  hideoutsRequiredThisStep,
}: HeaderProps) {
  return (
    <div className="fugitive-play-header">
      <div className="fugitive-play-header__row">
        <h2 className="fugitive-play-header__title">วาง Hideout</h2>
        {hideoutsRequiredThisStep > 0 && (
          <span className="fugitive-play-header__required">
            ต้องวางอีก {hideoutsRequiredThisStep} ใบ
          </span>
        )}
      </div>
      <p className="fugitive-play-header__range">
        {formatReachableLabel(lastHideoutValue, staging.sprints)}
      </p>
    </div>
  );
}

export function FugitivePlayActions({
  lastHideoutValue,
  staging,
  canPass,
  onConfirm,
  onPass,
}: ActionsProps) {
  const placement =
    staging.hideout !== null
      ? tryStageHideout(lastHideoutValue, staging.hideout, staging.sprints)
      : null;

  const canConfirm = staging.hideout !== null && placement?.ok === true;

  return (
    <div className="fugitive-play-actions" aria-label="ยืนยันการวาง hideout">
      {placement && staging.hideout !== null && (
        <p
          className={[
            'fugitive-placement-preview',
            placement.ok ? '' : 'fugitive-placement-preview--error',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {placement.ok
            ? `พร้อมวางการ์ด ${staging.hideout} · Sprint ต้องการ +${placement.sprintNeeded} · ใส่ +${placement.sprintProvided}`
            : placement.error}
        </p>
      )}

      <div className="fugitive-actions">
        <Button type="button" disabled={!canConfirm} onClick={onConfirm}>
          ยืนยันวาง Hideout
          {staging.hideout !== null ? ` (${staging.hideout})` : ''}
        </Button>
        {canPass && (
          <Button type="button" variant="secondary" onClick={onPass}>
            Pass
          </Button>
        )}
      </div>
    </div>
  );
}
