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

/**
 * Stored in the private sub-collection /games/{gameId}/boards/{playerId}.
 * Only the owning player can read this document — the opponent never sees cores.
 */
export interface PrivateBoard {
  playerId: string;
  cores: PlacedCore[];
}

/**
 * A shot fired by the attacker that has not yet been resolved by the defender.
 * The attacker only records the cell index; hit/miss is determined by the defender
 * reading their own PrivateBoard, preventing the attacker from fabricating hits.
 */
export interface PendingShot {
  index: number;
  shooterId: string;
  timestamp: number;
}

export type GamePhase = 'waiting' | 'placement' | 'playing' | 'finished';

export interface GameDocument {
  gameId: string;
  phase: GamePhase;
  createdAt: number;
  playerOne: string | null;
  playerTwo: string | null;
  /** True once playerOne has submitted their board placement. */
  boardOnePlaced: boolean;
  /** True once playerTwo has submitted their board placement. */
  boardTwoPlaced: boolean;
  shotsByOne: Shot[];
  shotsByTwo: Shot[];
  currentTurn: string | null;
  winner: string | null;
  /**
   * A shot fired but not yet resolved. The defending player's client reads this,
   * checks their private board, and writes the result via resolveShot().
   */
  pendingShot: PendingShot | null;
}

export interface CellState {
  index: number;
  hasCore: boolean;
  isHit: boolean;
  isMiss: boolean;
  coreId: CoreType | null;
  isDisabled: boolean;
}
