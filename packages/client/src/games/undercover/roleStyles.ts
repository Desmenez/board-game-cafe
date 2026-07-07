import type { UndercoverRole } from 'shared';

export function ucRoleModifier(role: UndercoverRole): string {
  return role === 'mr_white' ? 'mr-white' : role;
}

export function ucRoleCardClass(role: UndercoverRole): string {
  return `uc-role-card uc-role-card--${ucRoleModifier(role)}`;
}
