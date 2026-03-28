import type { AvalonRole } from 'shared';

const cloudName = 'dpkqjlk3g';
const cloudinaryBase = cloudName
  ? `https://res.cloudinary.com/${cloudName}/image/upload`
  : '';

function cloudinaryImage(publicId: string): string {
  return cloudinaryBase ? `${cloudinaryBase}/${publicId}` : '';
}

/** Distinct Loyal Servant arts — order must match `AVALON_LOYAL_SERVANT_PORTRAIT_COUNT` on server. */
export const loyalServantPortraitUrls = [
  cloudinaryImage('v1774628592/loyal-servant_xuywyw'),
  cloudinaryImage('v1774628592/loyal-servant-2_t9bjw4'),
  cloudinaryImage('v1774628592/loyal-servant-3_vprffq'),
  cloudinaryImage('v1774628592/loyal-servant-4_gtwgva'),
  cloudinaryImage('v1774628592/loyal-servant-5_egpnd6'),
] as const;

/** Distinct Minion arts — order must match `AVALON_MINION_PORTRAIT_COUNT` on server. */
export const minionPortraitUrls = [
  cloudinaryImage('v1774628592/minion-of-mordred_y0gw59'),
  cloudinaryImage('v1774628592/minion-of-mordred-2_xmu2c5'),
  cloudinaryImage('v1774628592/minion-of-mordred-3_zimupu'),
] as const;

const AVALON_STATIC_ROLE_PORTRAITS: Record<Exclude<AvalonRole, 'loyal_servant' | 'minion'>, string> =
  {
    merlin: cloudinaryImage('v1774628592/merlin_rxlhn5'),
    percival: cloudinaryImage('v1774628592/percival_ikzpaa'),
    assassin: cloudinaryImage('v1774628592/assassin_h5y9qq'),
    morgana: cloudinaryImage('v1774628592/morgana_sfhgjv'),
    mordred: cloudinaryImage('v1774628592/mordred_gzlrp7'),
    oberon: cloudinaryImage('v1774628592/oberon_fmvdxm'),
  };

/** Card art URL for a role; `portraitVariant` indexes variant pools for loyal_servant / minion. */
export function getAvalonRolePortraitUrl(role: AvalonRole, portraitVariant?: number): string {
  const v = portraitVariant ?? 0;
  if (role === 'loyal_servant') {
    const list = loyalServantPortraitUrls;
    return list[Math.min(v, list.length - 1)]!;
  }
  if (role === 'minion') {
    const list = minionPortraitUrls;
    return list[Math.min(v, list.length - 1)]!;
  }
  return AVALON_STATIC_ROLE_PORTRAITS[role];
}

export const imageMap = {
  avalon: {
    cover: cloudinaryImage('v1774628592/cover_pkoxtl'),
    /** Generic card back shown before flip during “all roles in this game” reveal */
    roleCardBack: cloudinaryImage('v1774659651/back-card_wlteok'),
    role: {
      ...AVALON_STATIC_ROLE_PORTRAITS,
      loyalServantPortraits: loyalServantPortraitUrls,
      minionPortraits: minionPortraitUrls,
    },
    quest: {
      success: cloudinaryImage('v1774628592/success_vfhocc'),
      fail: cloudinaryImage('v1774628592/fail_uz50fd'),
    },
    /** Subtle guard art — team vote “ไป Quest” cards (and similar UI) */
    questHistoryGuard: cloudinaryImage('v1774631535/guard_p4mgx6'),
  },
  explodingKittens: {},
  codenames: {},
  coup: {},
} as const;
