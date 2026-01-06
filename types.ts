export enum TileColor {
  BLACK = 'BLACK',
  WHITE = 'WHITE',
}

export interface Tile {
  id: string;
  color: TileColor;
  value: number; // -1 for Joker
  sortValue: number; // Used for ordering in hand (e.g. 3.5 to go between 3 and 4)
  isRevealed: boolean;
  ownerId: string | null;
  isJoker: boolean;
  isPlaced: boolean; // True if the user has already moved this Joker once
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  hand: Tile[];
  isEliminated: boolean;
  avatar: string;
}

export enum GamePhase {
  SETUP = 'SETUP',
  DRAW = 'DRAW',
  GUESS = 'GUESS',
  RESOLVE = 'RESOLVE',
  TURN_END = 'TURN_END',
  GAME_OVER = 'GAME_OVER',
}

export interface GameState {
  players: Player[];
  currentTurnPlayerId: string;
  drawnTile: Tile | null; // The tile currently holding but not yet slotted firmly (if incorrect guess)
  pool: Tile[];
  phase: GamePhase;
  winnerId: string | null;
  turnLog: string[];
  moveNumber: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: Date;
}

export interface PlayerSetupConfig {
  name: string;
  avatar: string;
  isBot: boolean;
}

export interface GameConfig {
  playerCount: number;
  timerSeconds: number;
  botCount: number;
  playerDetails: PlayerSetupConfig[];
  includeJokers: boolean;
}