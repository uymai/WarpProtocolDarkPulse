export type CoreType =
  | 'pulse_core'
  | 'dark_core_a'
  | 'dark_core_b'
  | 'warp_core'
  | 'singularity_core';

export interface CoreDefinition {
  id: CoreType;
  displayName: string;
  flavorText: string;
  size: number;
}

export type Orientation = 'horizontal' | 'vertical';

export interface PlacedCore {
  id: CoreType;
  cells: number[];
  orientation: Orientation;
  disabled: boolean;
}

export interface Shot {
  index: number;
  hit: boolean;
  coreHit: CoreType | null;
  timestamp: number;
}

export interface PlayerBoard {
  playerId: string;
  cores: PlacedCore[];
  placementComplete: boolean;
}

export type GamePhase = 'waiting' | 'placement' | 'playing' | 'finished';

export interface GameDocument {
  gameId: string;
  phase: GamePhase;
  createdAt: number;
  playerOne: string | null;
  playerTwo: string | null;
  boardOne: PlayerBoard | null;
  boardTwo: PlayerBoard | null;
  shotsByOne: Shot[];
  shotsByTwo: Shot[];
  currentTurn: string | null;
  winner: string | null;
}

export interface CellState {
  index: number;
  hasCore: boolean;
  isHit: boolean;
  isMiss: boolean;
  coreId: CoreType | null;
  isDisabled: boolean;
}
