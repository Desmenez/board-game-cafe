import { useEffect, useMemo, useState } from 'react';
import { Gift, Lock } from 'lucide-react';
import {
  effectiveUnlockedAchievementIds,
  getGameRewardTrack,
  type CosmeticReward,
  type GameRewardAchievementDef,
} from 'shared';
import { fetchOwnAchievementStats, fetchOwnAchievementUnlocks } from '../auth/profileApi';
import { useAuth } from '../auth/useAuth';
import { cn } from '../utils/cn';
import { Button, Dialog, DialogDescription, DialogFooter, DialogTitle } from './ui';

interface Props {
  open: boolean;
  onClose: () => void;
  gameId: string;
  gameName: string;
}

function rewardTypeLabel(reward: CosmeticReward): string {
  switch (reward.type) {
    case 'title':
      return 'ฉายา';
    case 'icon':
      return 'ไอคอน';
    case 'nameplate':
      return 'พื้นหลังชื่อ';
    case 'chip':
      return 'ชิปชื่อ';
  }
}

function RewardPreview({ item }: { item: GameRewardAchievementDef }) {
  const { cosmetic } = item;
  if (cosmetic.videoUrl) {
    return (
      <video
        className="size-12 shrink-0 rounded-md object-cover"
        src={cosmetic.videoUrl}
        muted
        loop
        playsInline
        autoPlay
        aria-hidden
      />
    );
  }
  if (cosmetic.imageUrl) {
    return (
      <img
        className="size-12 shrink-0 rounded-md object-cover"
        src={cosmetic.imageUrl}
        alt=""
        width={48}
        height={48}
        draggable={false}
      />
    );
  }
  return (
    <span
      className="flex size-12 shrink-0 items-center justify-center rounded-md border border-rule bg-paper-3 font-label text-[10px] font-bold tracking-wide text-ink-2"
      aria-hidden
    >
      {rewardTypeLabel(item.reward)}
    </span>
  );
}

export function GameRewardTrackDialog({ open, onClose, gameId, gameName }: Props) {
  const { user } = useAuth();
  const track = useMemo(() => getGameRewardTrack(gameId), [gameId]);
  const [unlocked, setUnlocked] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const canShowUnlockStatus = Boolean(user);

  useEffect(() => {
    if (!open) return;
    if (!user) {
      setUnlocked(new Set());
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void Promise.all([fetchOwnAchievementUnlocks(user.id), fetchOwnAchievementStats(user.id)])
      .then(([ids, stats]) => {
        if (cancelled) return;
        setUnlocked(effectiveUnlockedAchievementIds(ids, stats));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      className="max-w-lg room-night-dialog"
      overlayClassName="room-night-dialog-overlay"
      aria-labelledby="game-reward-track-title"
      aria-describedby="game-reward-track-desc"
    >
      <DialogTitle id="game-reward-track-title" className="flex items-center gap-2">
        <Gift size={20} aria-hidden />
        ของรางวัล · {gameName}
      </DialogTitle>
      <DialogDescription id="game-reward-track-desc">
        {canShowUnlockStatus
          ? 'ชนะหรือเล่นเกมนี้ให้ครบเงื่อนไขเพื่อปลดล็อกของรางวัล — รายการที่ปลดแล้วจะถูกไฮไลต์'
          : 'ชนะหรือเล่นเกมนี้ให้ครบเงื่อนไขเพื่อปลดล็อกของรางวัล — เข้าสู่ระบบเพื่อดูว่าคุณปลดอะไรแล้ว'}
      </DialogDescription>

      {loading ? <p className="mt-4 text-sm text-ink-2">กำลังโหลด…</p> : null}

      <ul className="m-0 mt-4 flex max-h-[min(24rem,50vh)] list-none flex-col gap-2 overflow-y-auto p-0">
        {track.map((item) => {
          const isUnlocked = canShowUnlockStatus && unlocked.has(item.id);
          return (
            <li
              key={item.id}
              className={cn(
                'flex items-center gap-3 rounded-card border px-3 py-3',
                isUnlocked
                  ? 'border-pear/40 bg-paper-3 text-ink'
                  : 'border-rule bg-transparent text-ink-2',
              )}
            >
              <RewardPreview item={item} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-bold text-ink">{item.title}</span>
                  <span className="shrink-0 rounded-pill border border-rule px-2 py-0.5 font-label text-[10px] font-bold tracking-wide text-ink-2">
                    {rewardTypeLabel(item.reward)}
                  </span>
                </div>
                <p className="m-0 mt-1 text-xs leading-5 text-ink-2">{item.description}</p>
              </div>
              {canShowUnlockStatus ? (
                isUnlocked ? (
                  <span className="shrink-0 font-label text-xs font-bold text-pear">
                    ปลดล็อกแล้ว
                  </span>
                ) : (
                  <Lock size={16} className="shrink-0 text-ink-2" aria-label="ยังไม่ปลดล็อก" />
                )
              ) : null}
            </li>
          );
        })}
      </ul>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          ปิด
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
