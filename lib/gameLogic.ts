import {
  CoreDefinition,
  CoreType,
  CellState,
  Orientation,
  PlacedCore,
  PlayerBoard,
  Shot,
} from '@/types/game';

export const CORE_DEFINITIONS: CoreDefinition[] = [
  {
    id: 'pulse_core',
    displayName: 'Pulse Core',
    flavorText: 'Short-range signal emitter. Fragile but agile.',
    size: 2,
  },
  {
    id: 'dark_core_a',
    displayName: 'Dark Core I',
    flavorText: 'Stealth power module. Hard to locate, easy to lose.',
    size: 3,
  },
  {
    id: 'dark_core_b',
    displayName: 'Dark Core II',
    flavorText: 'Redundant power relay. One breach, and entropy begins.',
    size: 3,
  },
  {
    id: 'warp_core',
    displayName: 'Warp Core',
    flavorText: 'Primary drive matrix. Destruction is non-recoverable.',
    size: 4,
  },
  {
    id: 'singularity_core',
    displayName: 'Singularity Core',
    flavorText: 'The nexus of all system operations. Protect at all costs.',
    size: 5,
  },
];

export const GRID_SIZE = 10;
export const REQUIRED_CORE_IDS: CoreType[] = [
  'pulse_core',
  'dark_core_a',
  'dark_core_b',
  'warp_core',
  'singularity_core',
];

/**
 * Returns flat grid indices for a core starting at `startIndex`.
 * Returns empty array if placement would go out of bounds or wrap.
 */
export function cellsForCore(
  startIndex: number,
  size: number,
  orientation: Orientation
): number[] {
  const row = Math.floor(startIndex / GRID_SIZE);
  const col = startIndex % GRID_SIZE;

  if (orientation === 'horizontal') {
    if (col + size > GRID_SIZE) return [];
    return Array.from({ length: size }, (_, i) => startIndex + i);
  } else {
    if (row + size > GRID_SIZE) return [];
    return Array.from({ length: size }, (_, i) => startIndex + i * GRID_SIZE);
  }
}

/**
 * Validates that all cores are placed correctly:
 * - All 5 required core types present
 * - No overlaps
 * - Each core's cells are valid (no out-of-bounds, no row-wrap)
 */
export function isValidPlacement(cores: PlacedCore[]): boolean {
  const ids = cores.map((c) => c.id);
  for (const required of REQUIRED_CORE_IDS) {
    if (!ids.includes(required)) return false;
  }

  const allCells = new Set<number>();
  for (const core of cores) {
    for (const cell of core.cells) {
      if (cell < 0 || cell >= GRID_SIZE * GRID_SIZE) return false;
      if (allCells.has(cell)) return false;
      allCells.add(cell);
    }
    const def = CORE_DEFINITIONS.find((d) => d.id === core.id);
    if (!def || core.cells.length !== def.size) return false;
  }
  return true;
}

/**
 * Checks if a shot index hits any core on the board.
 */
export function checkHit(
  shotIndex: number,
  board: PlayerBoard
): { hit: boolean; coreHit: CoreType | null } {
  for (const core of board.cores) {
    if (core.cells.includes(shotIndex)) {
      return { hit: true, coreHit: core.id };
    }
  }
  return { hit: false, coreHit: null };
}

/**
 * Returns true if all cells of a core have been hit.
 */
export function isCoreDisabled(core: PlacedCore, shots: Shot[]): boolean {
  const hitIndices = new Set(shots.filter((s) => s.hit).map((s) => s.index));
  return core.cells.every((cell) => hitIndices.has(cell));
}

/**
 * Returns true if all cores on the board are disabled.
 */
export function checkWinCondition(board: PlayerBoard, shots: Shot[]): boolean {
  return board.cores.every((core) => isCoreDisabled(core, shots));
}

/**
 * Builds 100 CellState objects for Grid rendering.
 * revealCores=true for the owner's own board view; false for attack grid.
 */
export function buildCellStates(
  board: PlayerBoard | null,
  shots: Shot[],
  revealCores: boolean
): CellState[] {
  const total = GRID_SIZE * GRID_SIZE;
  const hitSet = new Set(shots.filter((s) => s.hit).map((s) => s.index));
  const missSet = new Set(shots.filter((s) => !s.hit).map((s) => s.index));

  const cellToCore = new Map<number, CoreType>();
  const disabledCores = new Set<CoreType>();

  if (board) {
    for (const core of board.cores) {
      for (const cell of core.cells) {
        cellToCore.set(cell, core.id);
      }
      if (isCoreDisabled(core, shots)) {
        disabledCores.add(core.id);
      }
    }
  }

  return Array.from({ length: total }, (_, i) => {
    const coreId = cellToCore.get(i) ?? null;
    return {
      index: i,
      hasCore: revealCores && coreId !== null,
      isHit: hitSet.has(i),
      isMiss: missSet.has(i),
      coreId,
      isDisabled: coreId !== null && disabledCores.has(coreId),
    };
  });
}
