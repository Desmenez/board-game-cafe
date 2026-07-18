import { useEffect, useState } from 'react';
import { Shield, Skull } from 'lucide-react';
import type { AvalonTeam } from 'shared';
import { Badge, Button, Dialog, DialogDescription, DialogTitle } from '../../../components/ui';
import { imageMap } from '../../../imageMap';

type Props = {
  broadcast?: {
    holderId: string;
    holderName: string;
    targetId: string;
    targetName: string;
  };
  secret?: { targetName: string; team: AvalonTeam };
  onAcknowledgeLady: () => void;
};

export function AvalonLadyRevealModals({ broadcast, secret, onAcknowledgeLady }: Props) {
  const broadcastKey = broadcast ? `${broadcast.holderId}:${broadcast.targetId}` : null;
  const [publicDismissedKey, setPublicDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!broadcastKey) setPublicDismissedKey(null);
  }, [broadcastKey]);

  const showPublic = Boolean(broadcast && !secret && publicDismissedKey !== broadcastKey);
  const showHolderReveal = Boolean(secret && broadcast);

  return (
    <>
      <Dialog
        open={showPublic && Boolean(broadcast)}
        onOpenChange={(open) => {
          if (!open) setPublicDismissedKey(broadcastKey);
        }}
        className="room-night-dialog max-w-md"
        aria-labelledby="lady-public-title"
        aria-describedby="lady-public-description"
      >
        {broadcast ? (
          <div className="text-center">
            <img
              src={imageMap.avalon.ladyOfTheLake}
              alt=""
              className="mx-auto mb-4 size-24 rounded-card border border-rule object-cover"
            />
            <DialogTitle
              id="lady-public-title"
              className="font-display text-xl font-extrabold text-ink"
            >
              Lady of the Lake
            </DialogTitle>
            <DialogDescription
              id="lady-public-description"
              className="mt-3 text-base leading-relaxed text-ink-2"
            >
              <strong className="text-ink">{broadcast.holderName}</strong> ใช้ Lady of the Lake กับ{' '}
              <strong className="text-ink">{broadcast.targetName}</strong>
            </DialogDescription>
            <p className="mt-2 text-sm text-ink-2">
              เฉพาะผู้ถือ Lady เท่านั้นที่เห็นฝ่ายของเป้าหมาย
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-5"
              onClick={() => setPublicDismissedKey(broadcastKey)}
            >
              รับทราบ
            </Button>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={showHolderReveal && Boolean(secret && broadcast)}
        onOpenChange={() => undefined}
        dismissible={false}
        className="room-night-dialog max-w-md"
        aria-labelledby="lady-secret-title"
        aria-describedby="lady-secret-description"
      >
        {secret && broadcast ? (
          <div className="text-center">
            <img
              src={imageMap.avalon.ladyOfTheLake}
              alt=""
              className="mx-auto mb-4 size-24 rounded-card border border-rule object-cover"
            />
            <DialogTitle
              id="lady-secret-title"
              className="font-display text-xl font-extrabold text-ink"
            >
              Lady of the Lake
            </DialogTitle>
            <DialogDescription
              id="lady-secret-description"
              className="mt-3 text-base leading-relaxed text-ink-2"
            >
              คุณตรวจสอบ <strong className="text-ink">{broadcast.targetName}</strong>
            </DialogDescription>
            <Badge
              size="lg"
              variant={secret.team === 'good' ? 'success' : 'danger'}
              className="mt-4"
              role="status"
            >
              {secret.team === 'good' ? (
                <Shield size={15} aria-hidden />
              ) : (
                <Skull size={15} aria-hidden />
              )}
              {secret.team === 'good' ? 'ฝ่ายดี' : 'ฝ่ายชั่ว'}
            </Badge>
            <p className="mt-3 text-sm text-ink-2">
              รับทราบผลเพื่อให้เกมดำเนินไปยังการเลือกทีม Quest
            </p>
            <Button type="button" className="mt-5" onClick={onAcknowledgeLady}>
              รับทราบผล
            </Button>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
