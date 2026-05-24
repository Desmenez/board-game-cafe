import { sanitizePlayerDisplayNameInput } from 'shared';

export function readGlobalPlayerNameFromStorage(): string {
  return sanitizePlayerDisplayNameInput(localStorage.getItem('playerName') || '');
}

export function writeGlobalPlayerNameToStorage(name: string): void {
  localStorage.setItem('playerName', name);
}
