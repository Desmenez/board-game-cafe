import { useEffect, useState } from 'react';
import { modernArtArtistLabel, type ModernArtAction, type ModernArtPlayerView } from 'shared';
import { GamePhasePanel } from '../../../components/game-shell';
import { Button, Input } from '../../../components/ui';

type Props = {
  view: ModernArtPlayerView;
  send: (action: ModernArtAction) => void;
  selectedId: string | null;
};

function AmountStepper({
  min,
  max,
  value,
  onChange,
  label,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  const clamped = Math.min(Math.max(value, min), Math.max(max, min));
  return (
    <div className="ma-stepper">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={clamped <= min}
        onClick={() => onChange(clamped - 1)}
        aria-label="ลด"
      >
        −
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={clamped}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ma-stepper__input tabular-nums"
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={clamped >= max}
        onClick={() => onChange(clamped + 1)}
        aria-label="เพิ่ม"
      >
        +
      </Button>
    </div>
  );
}

export function ModernArtActionPanel({ view, send, selectedId }: Props) {
  const you = view.you;
  const minBid = Math.max(you.minBid, 1);
  const [amount, setAmount] = useState(Math.min(Math.max(minBid, 1), Math.max(you.maxBid, 1)));

  useEffect(() => {
    setAmount(Math.min(Math.max(minBid, 1), Math.max(you.maxBid, 1)));
  }, [minBid, you.maxBid, view.auction?.kind, view.phase]);

  const selected = selectedId ? you.hand.find((c) => c.id === selectedId) : null;
  const canOfferSelected = you.canOffer && Boolean(selected);
  const canPlaySecond =
    you.canPlayDoubleSecond && selectedId != null && you.legalDoubleSeconds.includes(selectedId);

  if (view.phase === 'round_scoring') {
    return (
      <GamePhasePanel
        title={`จบรอบ ${view.round}`}
        description="ขายภาพให้ธนาคาร — ได้เงินเฉพาะศิลปินที่ติดท็อป 3 รอบนี้ (มูลค่า = รวมกระเบื้องทั้งคอลัมน์)"
        actions={
          you.canAckRound ? (
            <Button type="button" onClick={() => send({ type: 'ack_round' })}>
              {view.round >= 4 ? 'ดูผลจบเกม' : 'ไปรอบถัดไป'}
            </Button>
          ) : (
            <p className="text-sm text-ink-2">รอผู้เล่นกดต่อไป…</p>
          )
        }
        actionsPlacement="footer"
      >
        <ol className="ma-ranks">
          {view.roundRanks
            ?.filter((r) => r.count > 0)
            .map((r) => (
              <li key={r.artist} className="ma-ranks__row">
                <span className="ma-ranks__place">{r.place ? `#${r.place}` : '—'}</span>
                <span className={['ma-artist-dot', `ma-artist-dot--${r.artist}`].join(' ')} />
                <span className="ma-ranks__name">{modernArtArtistLabel(r.artist)}</span>
                <span className="tabular-nums text-ink-2">{r.count} ภาพ</span>
                <span className="tabular-nums">{r.place ? `ขาย $${r.saleValue}` : '$0'}</span>
              </li>
            ))}
        </ol>
        <ul className="ma-payouts">
          {view.roundPayouts?.map((p) => (
            <li key={p.playerId} className="flex justify-between gap-3 text-sm">
              <span>{p.name}</span>
              <span className="tabular-nums">
                {p.paintingCount} ภาพ · +${p.amount}
              </span>
            </li>
          ))}
        </ul>
      </GamePhasePanel>
    );
  }

  if (you.canSetPrice) {
    const price = Math.min(Math.max(amount, 1), you.maxBid);
    return (
      <GamePhasePanel
        title="ตั้งราคาคงที่"
        description="ตั้งได้ไม่เกินเงินที่มี — ถ้าไม่มีใครซื้อ คุณต้องซื้อในราคานี้"
        actions={
          <Button
            type="button"
            disabled={price < 1 || price > you.maxBid}
            onClick={() => send({ type: 'set_fixed_price', amount: price })}
          >
            ตั้ง ${price}
          </Button>
        }
        actionsPlacement="footer"
      >
        <AmountStepper min={1} max={you.maxBid} value={price} onChange={setAmount} label="ราคาคงที่" />
      </GamePhasePanel>
    );
  }

  if (view.phase === 'auction' && view.auction?.kind === 'fixed') {
    const buyer = view.seats.find((s) => s.id === view.auction?.nextBuyerId);
    return (
      <GamePhasePanel
        title={`ราคาคงที่ $${view.auction.fixedPrice ?? 0}`}
        description={
          you.canBuyFixed || you.canPass
            ? 'ซื้อในราคานี้ หรือผ่านให้คนถัดไป'
            : `รอ ${buyer?.name ?? 'ผู้เล่น'} ตัดสินใจ`
        }
        actions={
          you.canBuyFixed || you.canPass ? (
            <div className="flex flex-wrap gap-2">
              {you.canBuyFixed ? (
                <Button type="button" onClick={() => send({ type: 'buy_fixed' })}>
                  ซื้อ ${view.auction.fixedPrice}
                </Button>
              ) : null}
              {you.canPass ? (
                <Button type="button" variant="secondary" onClick={() => send({ type: 'pass' })}>
                  ไม่ซื้อ
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
        actionsPlacement="footer"
      />
    );
  }

  if (view.phase === 'auction' && (view.auction?.kind === 'open' || view.auction?.kind === 'once_around')) {
    const turnName =
      view.auction.kind === 'once_around'
        ? view.seats.find((s) => s.id === view.auction?.nextBidderId)?.name
        : null;
    const canRaise = you.canBid && you.maxBid >= minBid;
    return (
      <GamePhasePanel
        title={view.auction.kind === 'open' ? 'ประมูลเปิด' : 'รอบเดียว'}
        description={
          view.auction.kind === 'once_around'
            ? you.canBid || you.canPass
              ? 'สู้ราคาหรือผ่าน — แต่ละคนมีหนึ่งครั้ง (ผู้ถือค้อนคนสุดท้าย)'
              : `ตาของ ${turnName ?? 'ผู้เล่น'}`
            : 'สู้ราคาได้เรื่อย ๆ — ผู้ถือค้อนเคาะเมื่อคนอื่นผ่านหลังบิดล่าสุด'
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {canRaise ? (
              <Button type="button" onClick={() => send({ type: 'bid', amount })}>
                สู้ ${amount}
              </Button>
            ) : null}
            {you.canPass ? (
              <Button type="button" variant="secondary" onClick={() => send({ type: 'pass' })}>
                ผ่าน
              </Button>
            ) : null}
            {you.canCloseOpen ? (
              <Button type="button" variant="success" onClick={() => send({ type: 'close_open_auction' })}>
                เคาะ!
              </Button>
            ) : null}
          </div>
        }
        actionsPlacement="footer"
      >
        {canRaise ? (
          <AmountStepper min={minBid} max={you.maxBid} value={amount} onChange={setAmount} label="ยอดบิด" />
        ) : null}
      </GamePhasePanel>
    );
  }

  if (you.canOffer || you.canPlayDoubleSecond || you.canSkipDouble) {
    return (
      <GamePhasePanel
        title={you.canOffer ? 'เลือกภาพจากมือ' : 'ใบที่สอง'}
        description={
          you.canOffer
            ? selected
              ? 'กดประมูลใบที่เลือก'
              : 'แตะภาพในมือ แล้วประมูล'
            : 'ลงภาพศิลปินคนเดียวกัน (ห้ามเป็นประมูลคู่) หรือข้าม'
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {canOfferSelected ? (
              <Button type="button" onClick={() => send({ type: 'offer_painting', cardId: selected!.id })}>
                ประมูลใบนี้
              </Button>
            ) : null}
            {canPlaySecond ? (
              <Button type="button" onClick={() => send({ type: 'play_double_second', cardId: selectedId! })}>
                ลงใบที่สอง
              </Button>
            ) : null}
            {you.canSkipDouble ? (
              <Button type="button" variant="secondary" onClick={() => send({ type: 'skip_double_second' })}>
                ไม่ลง
              </Button>
            ) : null}
          </div>
        }
        actionsPlacement="footer"
      />
    );
  }

  if (view.phase === 'auction' && view.auction?.kind === 'sealed' && !you.canSubmitSealed) {
    return (
      <GamePhasePanel
        title="ประมูลลับ"
        description="รอผู้เล่นอื่นส่งซอง…"
      />
    );
  }

  if (view.phase === 'offer' || view.phase === 'double_wait' || view.phase === 'set_price' || view.phase === 'auction') {
    return (
      <GamePhasePanel title="รอตา" description={view.lastEvent} density="compact" />
    );
  }

  return null;
}
