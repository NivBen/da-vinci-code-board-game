import { TileColor, Tile } from './types';

export const TOTAL_NUMBERS = 12; // 0-11
export const JOKER_VALUE = -1;
export const DEFAULT_TIMER = 60;

// Factory for tiles
export const createInitialTiles = (includeJokers: boolean): Tile[] => {
  const tiles: Tile[] = [];

  // 0-11 Black and White
  for (let i = 0; i < TOTAL_NUMBERS; i++) {
    tiles.push({
      id: `b-${i}`,
      color: TileColor.BLACK,
      value: i,
      sortValue: i,
      isRevealed: false,
      ownerId: null,
      isJoker: false,
      isPlaced: false,
    });
    tiles.push({
      id: `w-${i}`,
      color: TileColor.WHITE,
      value: i,
      sortValue: i,
      isRevealed: false,
      ownerId: null,
      isJoker: false,
      isPlaced: false,
    });
  }

  if (includeJokers) {
    tiles.push({
      id: `b-joker`,
      color: TileColor.BLACK,
      value: JOKER_VALUE,
      sortValue: 100, // Default to end
      isRevealed: false,
      ownerId: null,
      isJoker: true,
      isPlaced: false,
    });
    tiles.push({
      id: `w-joker`,
      color: TileColor.WHITE,
      value: JOKER_VALUE,
      sortValue: 100, // Default to end
      isRevealed: false,
      ownerId: null,
      isJoker: true,
      isPlaced: false,
    });
  }

  return tiles;
};

// Helper to sort hand: sortValue asc, then Black < White
export const sortHand = (tiles: Tile[]): Tile[] => {
  return [...tiles].sort((a, b) => {
    // If sortValues are significantly different, sort by them
    if (Math.abs(a.sortValue - b.sortValue) > 0.001) {
      return a.sortValue - b.sortValue;
    }
    
    // If sortValues are essentially same (e.g. both Jokers at end, or Joker placed exactly at a number's slot),
    // Standard rule: Black < White
    if (a.color !== b.color) {
      return a.color === TileColor.BLACK ? -1 : 1;
    }
    
    return 0;
  });
};

export const AVATARS = [
  '🐶', '🐱', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁'
];
// Needed for backward compatibility if imported directly, though we use createInitialTiles now
export const INITIAL_TILES = createInitialTiles(false);