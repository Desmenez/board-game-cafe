import { Button } from '../../components/ui';

type Props = {
  isMyTurn: boolean;
  hasDrawnThisTurn: boolean;
  canPlay: boolean;
  onDrawTwo: () => void;
  onPlaySelected: () => void;
  selectedCardId: string | null;
};

export function Salem1692PlayPanel({
  isMyTurn,
  hasDrawnThisTurn,
  canPlay,
  onDrawTwo,
  onPlaySelected,
  selectedCardId,
}: Props) {
  if (!isMyTurn) {
    return <p className="s1692-event">รอเทิร์นของคุณ</p>;
  }

  return (
    <section className="s1692-panel s1692-play-panel" aria-label="การเล่น">
      <Button type="button" onClick={onDrawTwo} disabled={hasDrawnThisTurn}>
        จั่ว 2 ใบ
      </Button>
      <Button type="button" onClick={onPlaySelected} disabled={!canPlay || !selectedCardId}>
        เล่นการ์ดที่เลือก
      </Button>
    </section>
  );
}
