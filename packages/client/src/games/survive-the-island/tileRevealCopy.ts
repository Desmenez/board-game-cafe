import type {
  SurviveTheIslandAbility,
  SurviveTheIslandBack,
  SurviveTheIslandEffect,
  SurviveTheIslandTerrain,
} from 'shared';
import {
  STI_ABILITY_LABEL,
  STI_EFFECT_LABEL,
  STI_TERRAIN_LABEL,
  stiAbilitySrc,
  stiArt,
} from './art';

/** Thai copy matching the official Tile descriptions. */
export const STI_EFFECT_DESCRIPTION: Record<SurviveTheIslandEffect, string> = {
  shark:
    'วาง Shark บน Water space นี้; ถ้า Shark ทั้ง 6 ตัวอยู่บนกระดานแล้ว ให้ย้าย 1 ตัวมาที่นี่. Shark กำจัดเฉพาะ Adventurer ที่กำลังว่ายน้ำ.',
  kaiju:
    'วาง Kaiju บน Water space นี้; ถ้า Kaiju ทั้ง 2 ตัวอยู่บนกระดานแล้ว ให้ย้าย 1 ตัวมาที่นี่. Kaiju กำจัด Raft และผลัก Adventurer ไปช่องติดกันตามกติกา Creature.',
  raft: 'วาง Raft บน Water space นี้; หาก Raft ใน supply หมด ให้ย้าย Raft ว่างที่อยู่บนกระดานมาที่นี่แทน.',
  whirlpool:
    'วังวนกำจัด Adventurer, Raft และ Creature ทั้งหมดบน Water space นี้และ Water space ที่ติดกันทุกช่อง.',
  volcano:
    'ภูเขาไฟปะทุ! กำจัด Adventurer และ Creature บน space นี้ แต่ไม่กำจัด Raft; ทิ้ง Volcano ไว้หงายหน้าและผ่านไม่ได้. เปิดครบ 3 ลูก เกมจบ.',
};

/** Thai copy matching the official Tile descriptions. */
export const STI_ABILITY_DESCRIPTION: Record<SurviveTheIslandAbility, string> = {
  paddle: 'พาย: ขยับ Raft ว่าง หรือ Raft ที่คุณควบคุมได้ 1 หรือ 2 Water spaces.',
  dolphin:
    'โลมา: ขยับ Adventurer ของคุณที่กำลังว่ายน้ำ 1 หรือ 2 Water spaces; ปลายทางอาจเป็น land หรือ Raft ได้.',
  dive: 'ดำน้ำ: ย้าย Creature ตัวใดก็ได้บนกระดานไปยัง Water space ว่างช่องใดก็ได้.',
  'creature-die':
    'ลูกเต๋า Creature: ทอยลูกเต๋า (งูทะเล / ฉลาม / ไคจู) แล้วคุณขยับ Creature ที่ออกตามกติกาการเคลื่อนที่ของมัน; ถ้าไม่มีตัวนั้นบนกระดาน ให้ทิ้งการ์ดโดยไม่ขยับ.',
  repellent:
    'ยาขับไล่: เมื่อ Shark หรือ Kaiju อยู่ช่องเดียวกับ Adventurer ของคุณ ทุกคนเห็นหน้าต่างถามว่าจะใช้ไล่สัตว์หรือไม่; คนแรกที่กดใช้เอา Creature นั้นออก (งูทะเลไล่ไม่ได้).',
};

export function stiTileRevealLabel(back: SurviveTheIslandBack): string {
  if (back.kind === 'ability') return STI_ABILITY_LABEL[back.ability];
  return STI_EFFECT_LABEL[back.effect];
}

export function stiTileRevealDescription(back: SurviveTheIslandBack): string {
  if (back.kind === 'ability') return STI_ABILITY_DESCRIPTION[back.ability];
  return STI_EFFECT_DESCRIPTION[back.effect];
}

export function stiTileRevealTitle(back: SurviveTheIslandBack): string {
  if (back.kind === 'ability') return `ได้ Ability: ${STI_ABILITY_LABEL[back.ability]}`;
  if (back.effect === 'volcano') return 'ภูเขาไฟปะทุ!';
  return `เปิดผล: ${STI_EFFECT_LABEL[back.effect]}`;
}

export function stiTileRevealCard(back: SurviveTheIslandBack): { src: string; alt: string } {
  if (back.kind === 'ability') {
    return { src: stiAbilitySrc(back.ability), alt: STI_ABILITY_LABEL[back.ability] };
  }
  return { src: stiArt.effects[back.effect], alt: STI_EFFECT_LABEL[back.effect] };
}

export function stiTileLocationLabel(
  tileId: number,
  terrain: SurviveTheIslandTerrain | null,
): string {
  const terrainLabel = terrain ? STI_TERRAIN_LABEL[terrain] : 'เกาะ';
  return `${terrainLabel} #${tileId + 1}`;
}
