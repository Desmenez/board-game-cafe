import { imageMap } from '../../../imageMap';
import { cn } from '../../../utils/cn';

type Props = {
  dirhams: number;
  className?: string;
};

/** Current cash only; final score adds visible rug squares elsewhere. */
export function DirhamPurse({ dirhams, className }: Props) {
  return (
    <div className={cn('mk-purse', className)} title={`${dirhams} Dirham`}>
      <img src={imageMap.marrakech.coin5} alt="" className="mk-purse__coin" />
      <span className="mk-purse__total">{dirhams}</span>
    </div>
  );
}
