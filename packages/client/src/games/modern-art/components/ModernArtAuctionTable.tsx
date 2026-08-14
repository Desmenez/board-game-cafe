import {
  modernArtArtistLabel,
  modernArtAuctionLabelTh,
  modernArtCardBackUrl,
  type ModernArtCard,
  type ModernArtPlayerView,
} from 'shared';
import { GameCardImage } from '../../../components/ui';
import { PlayerIdentity } from '../../../components/player-avatar';
import { cn } from '../../../utils/cn';
import { MODERN_ART_CARD_RATIO, modernArtPaintingAlt, modernArtPaintingUrl } from '../art';

function Painting({ card, large }: { card: ModernArtCard; large?: boolean }) {
  return (
    <figure className={cn('ma-easel', large && 'ma-easel--large')}>
      <GameCardImage
        src={modernArtPaintingUrl(card)}
        alt={modernArtPaintingAlt(card)}
        aspectRatio={MODERN_ART_CARD_RATIO}
        width={large ? '11rem' : '7.5rem'}
      />
      <figcaption className="ma-easel__cap">
        <span className={cn('ma-artist-dot', `ma-artist-dot--${card.artist}`)} />
        {modernArtArtistLabel(card.artist)}
        <span className="ma-easel__kind">{modernArtAuctionLabelTh(card.auction)}</span>
      </figcaption>
    </figure>
  );
}

function WaitingLot() {
  return (
    <figure className="ma-easel ma-easel--large ma-easel--waiting">
      <GameCardImage
        src={modernArtCardBackUrl()}
        alt=""
        aspectRatio={MODERN_ART_CARD_RATIO}
        width="11rem"
        showZoom={false}
      />
      <figcaption className="ma-easel__cap justify-center text-center text-ink-2">
        รอผู้ถือค้อนเลือกภาพ
      </figcaption>
    </figure>
  );
}

export function ModernArtAuctionTable({ view }: { view: ModernArtPlayerView }) {
  const paintings =
    view.auction?.paintings ??
    (view.doubleWait ? [view.doubleWait.firstCard] : []);
  const auctioneer = view.seats.find((s) => s.id === view.auctioneerId);
  const high = view.auction?.highestBidderId
    ? view.seats.find((s) => s.id === view.auction?.highestBidderId)
    : null;
  const kind = view.auction?.kind;
  const chooser = view.doubleWait
    ? view.seats.find((s) => s.id === view.doubleWait!.currentChooserId)
    : null;

  return (
    <section className="ma-table rounded-card border border-rule bg-paper-2" aria-label="โต๊ะประมูล">
      <header className="ma-table__head">
        <div>
          <h2 className="font-display text-sm font-extrabold tracking-[-0.02em] md:text-base">
            {view.doubleWait
              ? 'ประมูลคู่ — รอใบที่สอง'
              : kind
                ? modernArtAuctionLabelTh(kind)
                : 'โต๊ะประมูล'}
          </h2>
          {auctioneer ? (
            <div className="mt-2">
              <PlayerIdentity playerId={auctioneer.id} name={auctioneer.name} avatarSize={28} secondary="ถือค้อน" />
            </div>
          ) : null}
        </div>
        {view.auction && kind !== 'fixed' && kind !== 'sealed' ? (
          <div className="ma-bid-hero" aria-live="polite">
            <span className="ma-bid-hero__label">บิดสูงสุด</span>
            <span className="ma-bid-hero__value tabular-nums">${view.auction.currentBid}</span>
            {high ? <span className="ma-bid-hero__who">{high.name}</span> : <span className="ma-bid-hero__who">—</span>}
          </div>
        ) : null}
        {view.auction?.kind === 'fixed' && view.auction.fixedPrice != null ? (
          <div className="ma-bid-hero" aria-live="polite">
            <span className="ma-bid-hero__label">ราคาคงที่</span>
            <span className="ma-bid-hero__value tabular-nums">${view.auction.fixedPrice}</span>
          </div>
        ) : null}
      </header>

      <div className="ma-table__stage">
        {paintings.length > 0 ? (
          paintings.map((card) => <Painting key={card.id} card={card} large={paintings.length === 1} />)
        ) : (
          <WaitingLot />
        )}
      </div>

      {chooser && view.doubleWait ? (
        <p className="ma-table__hint text-sm text-ink-2">ตาของ {chooser.name} — ลงใบที่สองหรือข้าม</p>
      ) : null}
    </section>
  );
}

export function ModernArtGalleries({ view, myId }: { view: ModernArtPlayerView; myId: string }) {
  const anyone = view.seats.some((s) => s.gallery.length > 0);
  if (!anyone) return null;
  return (
    <section className="ma-galleries" aria-label="ภาพที่ซื้อรอบนี้">
      {view.seats.map((s) =>
        s.gallery.length === 0 ? null : (
          <div key={s.id} className="ma-gallery rounded-card border border-rule bg-paper-2">
            <h3 className="ma-gallery__name">
              {s.name}
              {s.id === myId ? ' (คุณ)' : ''}
            </h3>
            <ul className="ma-gallery__row">
              {s.gallery.map((card) => (
                <li key={card.id}>
                  <Painting card={card} />
                </li>
              ))}
            </ul>
          </div>
        ),
      )}
    </section>
  );
}
