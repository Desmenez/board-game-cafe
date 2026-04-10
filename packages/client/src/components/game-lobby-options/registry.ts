import type { ComponentType } from 'react';
import { AvalonLobbyOptions } from './avalon/AvalonLobbyOptions';
import { DefaultLobbyOptions } from './common/DefaultLobbyOptions';
import { ExplodingKittensLobbyOptions } from './exploding-kittens/ExplodingKittensLobbyOptions';
import { InsiderLobbyOptions } from './insider/InsiderLobbyOptions';
import type { LobbyOptionsProps } from './types';

const lobbyOptionsRegistry: Record<string, ComponentType<LobbyOptionsProps> | undefined> = {
  avalon: AvalonLobbyOptions,
  'exploding-kittens': ExplodingKittensLobbyOptions,
  insider: InsiderLobbyOptions,
};

export function getLobbyOptionsComponent(gameId: string): ComponentType<LobbyOptionsProps> {
  return lobbyOptionsRegistry[gameId] ?? DefaultLobbyOptions;
}
