import { useEffect, useState } from 'react';
import {
  modernArtArtistLabel,
  modernArtAuctionLabelTh,
  type ModernArtAction,
  type ModernArtPlayerView,
} from 'shared';
import { GameCardActionModal } from '../../../components/game-shell';
import { PlayerIdentity } from '../../../components/player-avatar';
import { Button, Input } from '../../../components/ui';
import { modernArtPaintingAlt, modernArtPaintingUrl } from '../art';

type Props = {
  view: ModernArtPlayerView;
  myId: string;
  send: (action: ModernArtAction) => void;
};

export function ModernArtSealedModal({ view, myId, send }: Props) {
  const you = view.you;
  const open = Boolean(you.canSubmitSealed && view.auction?.kind === 'sealed');
  const hero = view.auction?.paintings[0];
  const me = view.seats.find((s) => s.id === myId);
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (open) setAmount(0);
  }, [open, view.auction?.paintings[0]?.id]);

  if (!hero) return null;

  const max = you.maxBid;
  const clamped = Math.min(Math.max(Math.trunc(amount) || 0, 0), max);

  return (
    <GameCardActionModal
      open={open}
      onOpenChange={() => undefined}
      dismissible={false}
      titleId="ma-sealed-title"
      title="ประมูลลับ"
      description="ใส่ยอดในซอง — $0 คือไม่สู้. เสมอยอดสูงสุด คนใกล้ค้อนตามเข็มนาฬิกาชนะ (ผู้ถือค้อนชนะถ้าเสมอกัน)"
      cardSrc={modernArtPaintingUrl(hero)}
      cardAlt={modernArtPaintingAlt(hero)}
      cardAspectRatio="630 / 945"
      meta={`${modernArtArtistLabel(hero.artist)} · ${modernArtAuctionLabelTh(hero.auction)}`}
      actors={
        me ? <PlayerIdentity playerId={me.id} name={me.name} avatarSize={32} secondary="ซองของคุณ" /> : null
      }
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={max}
            value={clamped}
            aria-label="ยอดในซอง"
            className="max-w-[8rem] tabular-nums"
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <Button type="button" onClick={() => send({ type: 'submit_sealed', amount: clamped })}>
            ส่งซอง ${clamped}
          </Button>
        </div>
      }
    />
  );
}
