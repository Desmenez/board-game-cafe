import type {
  SurviveTheIslandAbility,
  SurviveTheIslandColor,
  SurviveTheIslandCreatureKind,
  SurviveTheIslandEffect,
  SurviveTheIslandPhase,
  SurviveTheIslandTerrain,
} from 'shared';
import { imageMap } from '../../imageMap';

const sti = imageMap.surviveTheIsland;

export function stiAdventurerSrc(color: string): string {
  return (
    sti.tokens.adventurers[color as SurviveTheIslandColor] ?? sti.tokens.adventurers.blue
  );
}

export function stiCreatureSrc(kind: SurviveTheIslandCreatureKind): string {
  if (kind === 'sea-serpent') return sti.tokens.seaSerpent;
  if (kind === 'shark') return sti.tokens.shark;
  return sti.tokens.kaiju;
}

export function stiAbilitySrc(ability: SurviveTheIslandAbility): string {
  if (ability === 'creature-die') return sti.abilities.creatureDie;
  return sti.abilities[ability];
}

export function stiTerrainSrc(terrain: SurviveTheIslandTerrain): string {
  return sti.terrain[terrain];
}

export const STI_ABILITY_LABEL: Record<SurviveTheIslandAbility, string> = {
  paddle: 'พาย',
  dolphin: 'โลมา',
  dive: 'ดำน้ำ',
  'creature-die': 'ทอยลูกเต๋า',
  repellent: 'ไล่สัตว์',
};

export const STI_EFFECT_LABEL: Record<SurviveTheIslandEffect, string> = {
  shark: 'ฉลาม',
  kaiju: 'ไคจู',
  raft: 'แพ',
  whirlpool: 'วังวน',
  volcano: 'ภูเขาไฟ',
};

export const STI_CREATURE_LABEL: Record<SurviveTheIslandCreatureKind, string> = {
  'sea-serpent': 'งูทะเล',
  shark: 'ฉลาม',
  kaiju: 'ไคจู',
};

export const STI_TERRAIN_LABEL: Record<SurviveTheIslandTerrain, string> = {
  beach: 'ชายหาด',
  forest: 'ป่า',
  mountain: 'ภูเขา',
};

export function stiPhaseMeta(phase: SurviveTheIslandPhase): { src: string; label: string } {
  switch (phase) {
    case 'setup_adventurers':
      return { src: sti.tokens.adventurers.blue, label: 'วางผจญภัย' };
    case 'setup_rafts':
      return { src: sti.tokens.raft, label: 'วางแพ' };
    case 'action':
      return { src: sti.abilities.paddle, label: 'แอ็กชัน' };
    case 'rising_waters':
      return { src: sti.effects.whirlpool, label: 'น้ำขึ้น' };
    case 'creatures':
      return { src: sti.abilities.creatureDie, label: 'สัตว์ทะเล' };
    case 'game_over':
      return { src: sti.effects.volcano, label: 'เกมจบ' };
  }
}

export { sti as stiArt };
