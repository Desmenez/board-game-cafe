import type { ComponentType } from 'react';
import { AvalonLobbyOptions } from './avalon/AvalonLobbyOptions';
import { DefaultLobbyOptions } from './common/DefaultLobbyOptions';
import { ExplodingKittensLobbyOptions } from './exploding-kittens/ExplodingKittensLobbyOptions';
import type { LobbyOptionsProps } from './types';

const lobbyOptionsRegistry: Record<string, ComponentType<LobbyOptionsProps> | undefined> = {
  avalon: AvalonLobbyOptions,
  'exploding-kittens': ExplodingKittensLobbyOptions,
};

export function getLobbyOptionsComponent(gameId: string): ComponentType<LobbyOptionsProps> {
  return lobbyOptionsRegistry[gameId] ?? DefaultLobbyOptions;
}

