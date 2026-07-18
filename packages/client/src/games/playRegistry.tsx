import type { ReactNode } from 'react';
import type {
  AbracaPlayerView,
  AvalonPlayerView,
  CamelUpPlayerView,
  CodenamesPlayerView,
  CupTheCrabPlayerView,
  ExplodingKittensPlayerView,
  Flip7PlayerView,
  FugitivePlayerView,
  HuesAndCuesPlayerView,
  InsiderPlayerView,
  LoveLetterPlayerView,
  NameItPlayerView,
  OnuwPlayerView,
  PowsPlayerView,
  Salem1692PlayerView,
  SheriffPlayerView,
  SimiloPlayerView,
  SplendorPlayerView,
  SpyfallPlayerView,
  SushiGoPlayerView,
  TtrPlayerView,
  UndercoverPlayerView,
  WttdPlayerView,
} from 'shared';
import { AbracawhatGame } from './abracawhat/AbracawhatGame';
import { AvalonGame } from './avalon/AvalonGame';
import { CamelUpGame } from './camel-up/CamelUpGame';
import { CodenamesGame } from './codenames/CodenamesGame';
import { CupTheCrabGame } from './cup-the-crab/CupTheCrabGame';
import { ExplodingKittensGame } from './exploding-kittens';
import { Flip7Game } from './flip7/Flip7Game';
import { FugitiveGame } from './fugitive/FugitiveGame';
import { HuesAndCuesGame } from './hues-and-cues/HuesAndCuesGame';
import { InsiderGame } from './insider/InsiderGame';
import { LoveLetterGame } from './love-letter/LoveLetterGame';
import { NameItGame } from './name-it/NameItGame';
import { OneNightUltimateWerewolfGame } from './one-night-werewolf/OneNightUltimateWerewolfGame';
import { PanicOnWallStreetGame } from './panic-on-wall-street/PanicOnWallStreetGame';
import { Salem1692Game } from './salem-1692/Salem1692Game';
import { SheriffGame } from './sheriff-of-nottingham/SheriffGame';
import { SimiloGame } from './similo/SimiloGame';
import { SplendorGame } from './splendor/SplendorGame';
import { SpyfallGame } from './spyfall/SpyfallGame';
import { SushiGoGame } from './sushi-go/SushiGoGame';
import { TicketToRideGame } from './ticket-to-ride/TicketToRideGame';
import { UndercoverGame } from './undercover/UndercoverGame';
import { WelcomeToTheDungeonGame } from './welcome-to-the-dungeon/WelcomeToTheDungeonGame';

/** Shared session props RoomPage passes into every play view. */
export type GamePlayContext = {
  gameState: unknown;
  myId: string;
  sendAction: (action: unknown) => void;
  onLeave: () => void;
  onRestart?: () => void;
  isHost: boolean;
  remoteError: string | null;
  onClearRemoteError: () => void;
};

type GamePlayEntry = (ctx: GamePlayContext) => ReactNode;

const base = (ctx: GamePlayContext) => ({
  myId: ctx.myId,
  sendAction: ctx.sendAction,
  onLeave: ctx.onLeave,
  onRestart: ctx.onRestart,
});

/**
 * Play-view registry (mirrors `game-lobby-options/registry`).
 * New games: add one entry here — do not extend RoomPage if/else.
 */
const gamePlayRegistry: Record<string, GamePlayEntry> = {
  avalon: (ctx) => (
    <AvalonGame {...base(ctx)} gameState={ctx.gameState as AvalonPlayerView} isHost={ctx.isHost} />
  ),
  'exploding-kittens': (ctx) => (
    <ExplodingKittensGame {...base(ctx)} gameState={ctx.gameState as ExplodingKittensPlayerView} />
  ),
  'sheriff-of-nottingham': (ctx) => (
    <SheriffGame {...base(ctx)} gameState={ctx.gameState as SheriffPlayerView} />
  ),
  splendor: (ctx) => (
    <SplendorGame {...base(ctx)} gameState={ctx.gameState as SplendorPlayerView} />
  ),
  'name-it': (ctx) => (
    <NameItGame
      {...base(ctx)}
      gameState={ctx.gameState as NameItPlayerView}
      remoteError={ctx.remoteError}
      onClearRemoteError={ctx.onClearRemoteError}
    />
  ),
  insider: (ctx) => <InsiderGame {...base(ctx)} gameState={ctx.gameState as InsiderPlayerView} />,
  'hues-and-cues': (ctx) => (
    <HuesAndCuesGame {...base(ctx)} gameState={ctx.gameState as HuesAndCuesPlayerView} />
  ),
  'welcome-to-the-dungeon': (ctx) => (
    <WelcomeToTheDungeonGame
      {...base(ctx)}
      gameState={ctx.gameState as WttdPlayerView}
      isHost={ctx.isHost}
    />
  ),
  'ticket-to-ride': (ctx) => (
    <TicketToRideGame {...base(ctx)} gameState={ctx.gameState as TtrPlayerView} />
  ),
  flip7: (ctx) => <Flip7Game {...base(ctx)} gameState={ctx.gameState as Flip7PlayerView} />,
  abracawhat: (ctx) => (
    <AbracawhatGame {...base(ctx)} gameState={ctx.gameState as AbracaPlayerView} />
  ),
  codenames: (ctx) => (
    <CodenamesGame {...base(ctx)} gameState={ctx.gameState as CodenamesPlayerView} />
  ),
  'one-night-ultimate-werewolf': (ctx) => (
    <OneNightUltimateWerewolfGame
      {...base(ctx)}
      gameState={ctx.gameState as OnuwPlayerView}
      isHost={ctx.isHost}
    />
  ),
  'panic-on-wall-street': (ctx) => (
    <PanicOnWallStreetGame
      {...base(ctx)}
      gameState={ctx.gameState as PowsPlayerView}
      isHost={ctx.isHost}
    />
  ),
  'cup-the-crab': (ctx) => (
    <CupTheCrabGame {...base(ctx)} gameState={ctx.gameState as CupTheCrabPlayerView} />
  ),
  'camel-up': (ctx) => (
    <CamelUpGame {...base(ctx)} gameState={ctx.gameState as CamelUpPlayerView} />
  ),
  similo: (ctx) => <SimiloGame {...base(ctx)} gameState={ctx.gameState as SimiloPlayerView} />,
  fugitive: (ctx) => (
    <FugitiveGame {...base(ctx)} gameState={ctx.gameState as FugitivePlayerView} />
  ),
  'love-letter': (ctx) => (
    <LoveLetterGame {...base(ctx)} gameState={ctx.gameState as LoveLetterPlayerView} />
  ),
  spyfall: (ctx) => <SpyfallGame {...base(ctx)} gameState={ctx.gameState as SpyfallPlayerView} />,
  'sushi-go': (ctx) => (
    <SushiGoGame {...base(ctx)} gameState={ctx.gameState as SushiGoPlayerView} />
  ),
  'salem-1692': (ctx) => (
    <Salem1692Game {...base(ctx)} gameState={ctx.gameState as Salem1692PlayerView} />
  ),
  undercover: (ctx) => (
    <UndercoverGame
      {...base(ctx)}
      gameState={ctx.gameState as UndercoverPlayerView}
      isHost={ctx.isHost}
    />
  ),
};

export function renderActiveGame(gameId: string, ctx: GamePlayContext): ReactNode {
  return gamePlayRegistry[gameId]?.(ctx) ?? null;
}
