import {
  MODERN_ART_ARTISTS,
  modernArtArtistLabel,
  modernArtBoardUrl,
  modernArtValueTileUrl,
  type ModernArtArtistId,
  type ModernArtPlayerView,
} from 'shared';
import { cn } from '../../../utils/cn';
import {
  DEFAULT_VALUE_BOARD_LAYOUT,
  posStyle,
  type ModernArtValueBoardLayout,
} from '../boardLayout';

const ARTIST_CLASS: Record<ModernArtArtistId, string> = {
  carvalho: 'ma-col--carvalho',
  thaler: 'ma-col--thaler',
  melim: 'ma-col--melim',
  martins: 'ma-col--martins',
  silveira: 'ma-col--silveira',
};

function columnSum(view: ModernArtPlayerView, artist: ModernArtArtistId): number {
  return view.valueBoard[artist].reduce<number>((sum, tile) => sum + (tile ?? 0), 0);
}

function artistLastName(id: ModernArtArtistId): string {
  const label = modernArtArtistLabel(id);
  return label.slice(label.lastIndexOf(' ') + 1);
}

export function ModernArtValueBoard({
  view,
  layout = DEFAULT_VALUE_BOARD_LAYOUT,
}: {
  view: ModernArtPlayerView;
  layout?: ModernArtValueBoardLayout;
}) {
  const nowRow = view.phase !== 'game_over' ? view.round - 1 : -1;

  return (
    <section className="ma-board rounded-card border border-rule bg-paper-2" aria-label="บอร์ดมูลค่าศิลปิน">
      <header className="ma-board__head">
        <h2 className="font-display text-sm font-extrabold tracking-[-0.02em] text-ink md:text-base">
          มูลค่าตลาด
        </h2>
        <p className="text-xs text-ink-2">รอบ {view.round} / 4 · ภาพที่ 5 ของศิลปินคนใดคนหนึ่งจบรอบ</p>
      </header>

      <div className="ma-board__stage">
        <img
          src={modernArtBoardUrl()}
          alt=""
          className="ma-board__art"
          draggable={false}
        />
        {nowRow >= 0 ? (
          <div
            className="ma-board__row-now"
            style={{
              left: `${layout.rowBand.left}%`,
              top: `${layout.rowTops[nowRow]}%`,
              width: `${layout.rowBand.width}%`,
              height: `${layout.rowBand.height}%`,
            }}
            aria-hidden
          />
        ) : null}
        {layout.rowTops.map((top, roundIdx) =>
          MODERN_ART_ARTISTS.map((artist, colIdx) => {
            const tile = view.valueBoard[artist][roundIdx];
            const isNow = nowRow === roundIdx;
            return (
              <div
                key={`${artist}-${roundIdx}`}
                className={cn('ma-board__slot', isNow && 'ma-board__slot--now', tile && 'ma-board__slot--filled')}
                style={{
                  ...posStyle({ left: layout.colLefts[colIdx]!, top }),
                  width: `${layout.slotSize}%`,
                }}
              >
                {tile ? (
                  <img
                    src={modernArtValueTileUrl(tile)}
                    alt={`${modernArtArtistLabel(artist)} รอบ ${roundIdx + 1} $${tile}`}
                    className="ma-board__tile"
                  />
                ) : (
                  <span className="sr-only">
                    {modernArtArtistLabel(artist)} รอบ {roundIdx + 1} ว่าง
                  </span>
                )}
              </div>
            );
          }),
        )}
      </div>

      <div className="ma-board__stats" role="table" aria-label="ภาพรอบนี้และมูลค่ารวม">
        <div className="ma-board__stats-row ma-board__stats-row--head" role="row">
          <span className="ma-board__stats-stub" role="columnheader">
            <span className="sr-only">ศิลปิน</span>
          </span>
          {MODERN_ART_ARTISTS.map((artist) => (
            <span key={artist} role="columnheader" className={cn('ma-board__stats-name', ARTIST_CLASS[artist])}>
              {artistLastName(artist)}
            </span>
          ))}
        </div>
        <div className="ma-board__stats-row" role="row">
          <span className="ma-board__stats-stub" role="rowheader">
            รอบนี้
          </span>
          {MODERN_ART_ARTISTS.map((artist) => (
            <span
              key={artist}
              role="cell"
              className={cn('ma-board__count', view.playedThisRound[artist] >= 4 && 'ma-board__count--hot')}
            >
              {view.playedThisRound[artist]}
            </span>
          ))}
        </div>
        <div className="ma-board__stats-row" role="row">
          <span className="ma-board__stats-stub" role="rowheader">
            รวม
          </span>
          {MODERN_ART_ARTISTS.map((artist) => (
            <span key={artist} role="cell" className="ma-board__sum-val tabular-nums">
              ${columnSum(view, artist)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
