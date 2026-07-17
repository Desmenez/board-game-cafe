import { useMemo } from 'react';
import type { AvalonRole } from 'shared';
import { getTeamForRole } from 'shared';
import { type GameProgressValue } from '../../components/game-shell';
import { DeckCompositionReveal } from '../../components/secret-identity';
import { getAvalonRolePortraitUrl, imageMap } from '../../imageMap';
import { ROLE_LABEL } from './avalonRoles';

type Props = {
  roles: AvalonRole[];
  portraitVariants?: number[];
  hasAcknowledged: boolean;
  progress: GameProgressValue;
  onAcknowledge: () => void;
};

export function AvalonCompositionStage({
  roles,
  portraitVariants,
  hasAcknowledged,
  progress,
  onAcknowledge,
}: Props) {
  const slots = useMemo(() => {
    const variants = portraitVariants ?? roles.map(() => 0);
    return roles.map((role, i) => {
      const portraitVariant = variants[i] ?? 0;
      return {
        key: `${role}-${i}-${portraitVariant}`,
        imageSrc: getAvalonRolePortraitUrl(role, portraitVariant),
        label: ROLE_LABEL[role],
        tone: getTeamForRole(role) as 'good' | 'evil',
      };
    });
  }, [roles, portraitVariants]);

  return (
    <DeckCompositionReveal
      slots={slots}
      cardBackSrc={imageMap.avalon.roleCardBack}
      hasAcknowledged={hasAcknowledged}
      progress={progress}
      onAcknowledge={onAcknowledge}
    />
  );
}
