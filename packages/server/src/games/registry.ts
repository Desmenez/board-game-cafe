import type { GameDefinition, GameMeta } from 'shared';

// ============================================================
// Game Registry — register games here
// ============================================================

const games = new Map<string, GameDefinition>();

export function registerGame(game: GameDefinition): void {
  if (games.has(game.id)) {
    console.warn(`Game "${game.id}" is already registered. Overwriting.`);
  }
  games.set(game.id, game);
  console.log(`✅ Registered game: ${game.name}`);
}

export function getGame(id: string): GameDefinition | undefined {
  return games.get(id);
}

export function listGames(): GameMeta[] {
  return Array.from(games.values()).map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    minPlayers: g.minPlayers,
    maxPlayers: g.maxPlayers,
    thumbnail: g.thumbnail,
  }));
}
