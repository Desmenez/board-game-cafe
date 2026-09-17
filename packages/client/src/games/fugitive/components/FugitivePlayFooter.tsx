import { Button } from '../../../components/ui';
import { formatReachableLabel, type StagingState, tryStageHideout } from '../lib/fugitivePlacement';

type HeaderProps = {
  lastHideoutValue: number;
  staging: StagingState;
  hideoutsRequiredThisStep: number;
  isFirstTurn?: boolean;
};

type ActionsProps = {
  lastHideoutValue: number;
  staging: StagingState;
  canPass: boolean;
  passLabel?: string;
  onConfirm: () => void;
  onPass: () => void;
};

export function FugitivePlayHeader({
  lastHideoutValue,
  staging,
  hideoutsRequiredThisStep,
  isFirstTurn = false,
}: HeaderProps) {
  const requiredLabel = isFirstTurn
    ? hideoutsRequiredThisStep >= 2
      ? 'วางได้ 1 หรือ 2 ใบ'
      : hideoutsRequiredThisStep === 1
        ? 'วางได้อีก 1 ใบ หรือข้ามจบเทิร์น'
        : ''
    : hideoutsRequiredThisStep > 0
      ? `ต้องวางอีก ${hideoutsRequiredThisStep} ใบ`
      : '';

  return (
    <div className="fugitive-play-header">
      <div className="fugitive-play-header__row">
        <h2 className="fugitive-play-header__title">วาง Hideout</h2>
        {requiredLabel ? (
          <span className="fugitive-play-header__required">{requiredLabel}</span>
        ) : null}
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
  passLabel = 'ข้าม',
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
            {passLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
