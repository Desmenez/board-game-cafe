import type { CsFilesRole } from 'shared';
import { CS_FILES_ROLE_DESCRIPTION_TH, CS_FILES_ROLE_LABEL_TH } from 'shared';
import type { DeckCompositionTone, SecretIdentityTone } from '../../../components/secret-identity';
import { csFilesRoleCardUrl, imageMap } from '../../../imageMap';

export const ROLE_REVEAL_META: Record<
  CsFilesRole,
  {
    title: string;
    affiliation: string;
    tone: SecretIdentityTone;
    compositionTone: DeckCompositionTone;
    hint: string;
  }
> = {
  forensic: {
    title: CS_FILES_ROLE_LABEL_TH.forensic,
    affiliation: 'ฝ่ายดี · เปิดเผยตัว',
    tone: 'default',
    compositionTone: 'default',
    hint: CS_FILES_ROLE_DESCRIPTION_TH.forensic,
  },
  murderer: {
    title: CS_FILES_ROLE_LABEL_TH.murderer,
    affiliation: 'ฝ่ายร้าย',
    tone: 'evil',
    compositionTone: 'evil',
    hint: CS_FILES_ROLE_DESCRIPTION_TH.murderer,
  },
  investigator: {
    title: CS_FILES_ROLE_LABEL_TH.investigator,
    affiliation: 'ฝ่ายดี',
    tone: 'good',
    compositionTone: 'good',
    hint: CS_FILES_ROLE_DESCRIPTION_TH.investigator,
  },
  accomplice: {
    title: CS_FILES_ROLE_LABEL_TH.accomplice,
    affiliation: 'ฝ่ายร้าย',
    tone: 'evil',
    compositionTone: 'evil',
    hint: CS_FILES_ROLE_DESCRIPTION_TH.accomplice,
  },
  witness: {
    title: CS_FILES_ROLE_LABEL_TH.witness,
    affiliation: 'ฝ่ายดี',
    tone: 'good',
    compositionTone: 'good',
    hint: CS_FILES_ROLE_DESCRIPTION_TH.witness,
  },
};

export const COMPOSITION_ROLE_ORDER = [
  'forensic',
  'murderer',
  'accomplice',
  'witness',
  'investigator',
] as const satisfies readonly CsFilesRole[];

export { csFilesRoleCardUrl };

export const CS_FILES_ROLE_BACK_URL = imageMap.csFiles.roleBack;
export const CS_FILES_BADGE_URL = imageMap.csFiles.badge;

/** Evidence (brown) / means (blue) card art — 457 × 745 */
export const CS_FILES_CARD_ASPECT_CLASS = 'aspect-[457/745]';
