import type { OnuwRole } from 'shared';
import { ONUW_ROLE_DESCRIPTION_TH, onuwTeamForRole } from 'shared';
import { Button, Dialog, DialogDescription, DialogFooter, DialogTitle } from '../../components/ui';
import { onuwCardBackUrl, onuwRoleCardUrl } from '../../imageMap';
import { ROLE_LABEL_EN, ROLE_LABEL_TH, TEAM_LABEL_TH } from './onuwRoles';

type Props = {
  detail: { role: OnuwRole; artKey: string } | null;
  onClose: () => void;
  titleId: string;
};

export function OnuwRoleDetailDialog({ detail, onClose, titleId }: Props) {
  return (
    <Dialog
      open={detail !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      contentClassName={
        detail !== null
          ? `modal onuw-role-detail-dialog onuw-role-detail-dialog--${onuwTeamForRole(detail.role)}`
          : 'modal onuw-role-detail-dialog'
      }
      aria-labelledby={titleId}
    >
      {detail !== null ? (
        <>
          <div className="onuw-role-detail-heading">
            <span
              className={`onuw-role-detail-team onuw-role-detail-team--${onuwTeamForRole(detail.role)}`}
            >
              {TEAM_LABEL_TH[onuwTeamForRole(detail.role)]}
            </span>
            <DialogTitle id={titleId} className="onuw-role-detail-title">
              {ROLE_LABEL_TH[detail.role]}
            </DialogTitle>
            <p className="onuw-role-detail-title-en">{ROLE_LABEL_EN[detail.role]}</p>
          </div>
          <div className="onuw-role-detail-body">
            <img
              src={detail.artKey ? onuwRoleCardUrl(detail.artKey) : onuwCardBackUrl()}
              alt=""
              className="onuw-role-detail-img"
            />
            <DialogDescription className="onuw-role-detail-desc">
              {ONUW_ROLE_DESCRIPTION_TH[detail.role]}
            </DialogDescription>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              ปิด
            </Button>
          </DialogFooter>
        </>
      ) : null}
    </Dialog>
  );
}
