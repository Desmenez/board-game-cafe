import type { ComponentType } from 'react';
import { AvalonLobbyOptions } from './avalon/AvalonLobbyOptions';
import { DefaultLobbyOptions } from './common/DefaultLobbyOptions';
import { ExplodingKittensLobbyOptions } from './exploding-kittens/ExplodingKittensLobbyOptions';
import { InsiderLobbyOptions } from './insider/InsiderLobbyOptions';
import { PowsLobbyOptions } from './panic-on-wall-street/PowsLobbyOptions';
import { SheriffLobbyOptions } from './sheriff/SheriffLobbyOptions';
import { WttdLobbyOptions } from './welcome-to-the-dungeon/WttdLobbyOptions';
import type { LobbyOptionsProps } from './types';

const lobbyOptionsRegistry: Record<string, ComponentType<LobbyOptionsProps> | undefined> = {
  avalon: AvalonLobbyOptions,
  'exploding-kittens': ExplodingKittensLobbyOptions,
  insider: InsiderLobbyOptions,
  'sheriff-of-nottingham': SheriffLobbyOptions,
  'panic-on-wall-street': PowsLobbyOptions,
  'welcome-to-the-dungeon': WttdLobbyOptions,
};

export function getLobbyOptionsComponent(gameId: string): ComponentType<LobbyOptionsProps> {
  return lobbyOptionsRegistry[gameId] ?? DefaultLobbyOptions;
}
