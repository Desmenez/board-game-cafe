import type { ExplodingKittensCardType } from 'shared';
import { imageMap } from '../../../imageMap';

/** คำอธิบายการ์ด — ใช้ร่วมทั้งเกม (มือ, modal, reaction) */
export const CARD_LABEL: Record<ExplodingKittensCardType, string> = {
  exploding_kitten: 'Exploding Kitten',
  defuse: 'Defuse',
  attack: 'Attack',
  skip: 'Skip',
  shuffle: 'Shuffle',
  see_future: 'See the Future',
  favor: 'Favor',
  targeted_attack: 'Targeted Attack',
  draw_from_bottom: 'Draw from the Bottom',
  alter_future: 'Alter the Future',
  nope: 'Nope',
  feral_cat: 'Feral Cat',
  cat_taco: 'Taco Cat',
  cat_melon: 'Cattermelon',
  cat_beard: 'Beard Cat',
  cat_rainbow: 'Rainbow Cat',
  cat_potato: 'Hairy Potato Cat',
  barking_kitten: 'Barking Kitten',
  bury: 'Bury',
  ill_take_that: "I'll Take That",
  personal_attack_3x: 'Personal Attack 3x',
  potluck: 'Potluck',
  share_future_3x: 'Share the Future',
  super_skip: 'Super Skip',
  tower_of_power: 'Tower of Power',
  alter_future_now: 'Alter the Future NOW',
};

export const CARD_IMAGE: Record<ExplodingKittensCardType, string> = imageMap.explodingKittens.cards;
export const CARD_BACK_URL = imageMap.explodingKittens.cardBack;
