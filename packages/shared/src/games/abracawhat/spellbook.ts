/**
 * Abracada…What? — spell text from the box (reference sheet).
 * Engine should implement resolution from `effectKind`; copy is for UI + i18n.
 */

export type AbracaSpellId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** What the server must resolve when a spell is successfully cast */
export type AbracaSpellEffectKind =
  | 'ancient_dragon'
  | 'dark_wanderer'
  | 'sweet_dream'
  | 'night_singer'
  | 'lightning_tempest'
  | 'blizzard'
  | 'fire_ball'
  | 'magic_drink';

export interface AbracaSpellDefinition {
  id: AbracaSpellId;
  effectKind: AbracaSpellEffectKind;
  nameEn: string;
  nameTh: string;
  /** Primary rules text (English, from box) */
  effectEn: string;
  /** Extra notes from box (English) */
  notesEn?: string;
}

export const ABRACA_SPELLBOOK: readonly AbracaSpellDefinition[] = [
  {
    id: 1,
    effectKind: 'ancient_dragon',
    nameEn: 'Ancient Dragon',
    nameTh: 'มังกรโบราณ',
    effectEn: 'Roll the die: All other players lose life according to the result.',
    notesEn:
      'If you fail to summon the dragon, you roll the die to see how many lives you lose. It is very dangerous to summon a dragon!',
  },
  {
    id: 2,
    effectKind: 'dark_wanderer',
    nameEn: 'Dark Wanderer',
    nameTh: 'นักเดินทางแห่งความมืด',
    effectEn: 'All other players lose 1 life. You gain 1 life (maximum of 6).',
  },
  {
    id: 3,
    effectKind: 'sweet_dream',
    nameEn: 'Sweet Dream',
    nameTh: 'ความฝันหวาน',
    effectEn: 'Roll the die: You gain life according to the result (maximum of 6).',
  },
  {
    id: 4,
    effectKind: 'night_singer',
    nameEn: 'Night Singer',
    nameTh: 'นักร้องราตรี',
    effectEn:
      'You may look at one of the secret stones and place it in front of yourself. If you have any life tokens left at the end of the round, you gain one extra move for each of the secret stones acquired this way.',
    notesEn:
      'You place the secret stone face-down in front of yourself but you may look at it again any time you want. You may not cast the spell with secret stone.',
  },
  {
    id: 5,
    effectKind: 'lightning_tempest',
    nameEn: 'Lightning Tempest',
    nameTh: 'พายุสายฟ้า',
    effectEn: 'The players to your left and right lose 1 life each.',
    notesEn: 'When playing with only 2 players, the other player only loses 1 life in total.',
  },
  {
    id: 6,
    effectKind: 'blizzard',
    nameEn: 'Blizzard',
    nameTh: 'พายุหิมะ',
    effectEn: 'The player to your left loses 1 life.',
  },
  {
    id: 7,
    effectKind: 'fire_ball',
    nameEn: 'Fire ball',
    nameTh: 'ลูกไฟ',
    effectEn: 'The player to your right loses 1 life.',
  },
  {
    id: 8,
    effectKind: 'magic_drink',
    nameEn: 'Magic Drink',
    nameTh: 'เครื่องดื่มวิเศษ',
    effectEn: 'You gain 1 life (maximum of 6).',
    notesEn:
      'Many players try attacking after recovering with this spell. But they lose life instead: remember you can only cast spells with the same or higher number after the first one. So after this spell you can only cast this spell again (because it has 8, the highest number). If you want to recover life before attacking you will have to try casting spell number 3 or 2 (but of course this is a lot more risky!).',
  },
] as const;

export const ABRACA_SPELL_BY_ID: Record<AbracaSpellId, AbracaSpellDefinition> = Object.fromEntries(
  ABRACA_SPELLBOOK.map((s) => [s.id, s]),
) as Record<AbracaSpellId, AbracaSpellDefinition>;
