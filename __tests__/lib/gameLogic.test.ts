import { describe, it, expect } from 'vitest';
import {
  cellsForCore,
  isValidPlacement,
  checkHit,
  isCoreDisabled,
  checkWinCondition,
  buildCellStates,
  GRID_SIZE,
} from '@/lib/gameLogic';
import type { PlacedCore, PlayerBoard, Shot } from '@/types/game';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCore(
  id: PlacedCore['id'],
  cells: number[],
  orientation: PlacedCore['orientation'] = 'horizontal',
  disabled = false
): PlacedCore {
  return { id, cells, orientation, disabled };
}

function makeBoard(cores: PlacedCore[]): PlayerBoard {
  return { playerId: 'p1', cores, placementComplete: true };
}

function makeShot(index: number, hit: boolean): Shot {
  return { index, hit, coreHit: hit ? 'pulse_core' : null, timestamp: 0 };
}

/** A valid full placement of all 5 cores with no overlaps. */
function validCores(): PlacedCore[] {
  return [
    makeCore('pulse_core', [0, 1]),
    makeCore('dark_core_a', [10, 11, 12]),
    makeCore('dark_core_b', [20, 21, 22]),
    makeCore('warp_core', [30, 31, 32, 33]),
    makeCore('singularity_core', [40, 41, 42, 43, 44]),
  ];
}

// ---------------------------------------------------------------------------
// cellsForCore
// ---------------------------------------------------------------------------

describe('cellsForCore', () => {
  it('horizontal: returns consecutive cells from startIndex', () => {
    expect(cellsForCore(0, 3, 'horizontal')).toEqual([0, 1, 2]);
  });

  it('horizontal: returns empty array when core overflows right edge', () => {
    // col 8 + size 3 = 11 > 10
    expect(cellsForCore(8, 3, 'horizontal')).toEqual([]);
  });

  it('horizontal: fits exactly to the right edge', () => {
    // col 7 + size 3 = 10, exactly fits
    expect(cellsForCore(7, 3, 'horizontal')).toEqual([7, 8, 9]);
  });

  it('vertical: returns cells stepping by GRID_SIZE', () => {
    expect(cellsForCore(0, 3, 'vertical')).toEqual([0, 10, 20]);
  });

  it('vertical: returns empty array when core overflows bottom edge', () => {
    // row 8 + size 3 = 11 > 10
    expect(cellsForCore(80, 3, 'vertical')).toEqual([]);
  });

  it('vertical: fits exactly to the bottom edge', () => {
    // row 7 + size 3 = 10, exactly fits
    expect(cellsForCore(70, 3, 'vertical')).toEqual([70, 80, 90]);
  });

  it('size 1 always returns a single cell', () => {
    expect(cellsForCore(55, 1, 'horizontal')).toEqual([55]);
    expect(cellsForCore(55, 1, 'vertical')).toEqual([55]);
  });
});

// ---------------------------------------------------------------------------
// isValidPlacement
// ---------------------------------------------------------------------------

describe('isValidPlacement', () => {
  it('returns true for a valid placement with all 5 cores', () => {
    expect(isValidPlacement(validCores())).toBe(true);
  });

  it('returns false when a required core type is missing', () => {
    const cores = validCores().filter((c) => c.id !== 'singularity_core');
    expect(isValidPlacement(cores)).toBe(false);
  });

  it('returns false when two cores share a cell', () => {
    const cores = validCores();
    // Shift warp_core to overlap with dark_core_b at cell 22
    cores[3] = makeCore('warp_core', [22, 23, 24, 25]);
    expect(isValidPlacement(cores)).toBe(false);
  });

  it('returns false when a core has more cells than its defined size', () => {
    const cores = validCores();
    // pulse_core size=2 but we give it 3 cells
    cores[0] = makeCore('pulse_core', [0, 1, 2]);
    expect(isValidPlacement(cores)).toBe(false);
  });

  it('returns false when a core cell is out of bounds', () => {
    const cores = validCores();
    cores[0] = makeCore('pulse_core', [99, 100]); // index 100 is out of bounds
    expect(isValidPlacement(cores)).toBe(false);
  });

  it('returns false when a core cell is negative', () => {
    const cores = validCores();
    cores[0] = makeCore('pulse_core', [-1, 0]);
    expect(isValidPlacement(cores)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkHit
// ---------------------------------------------------------------------------

describe('checkHit', () => {
  const board = makeBoard([makeCore('pulse_core', [5, 6])]);

  it('returns hit=true and the core id when shot lands on a core cell', () => {
    expect(checkHit(5, board)).toEqual({ hit: true, coreHit: 'pulse_core' });
    expect(checkHit(6, board)).toEqual({ hit: true, coreHit: 'pulse_core' });
  });

  it('returns hit=false and coreHit=null for an empty cell', () => {
    expect(checkHit(7, board)).toEqual({ hit: false, coreHit: null });
  });

  it('returns hit=false for index 0 when no core is placed there', () => {
    expect(checkHit(0, board)).toEqual({ hit: false, coreHit: null });
  });
});

// ---------------------------------------------------------------------------
// isCoreDisabled
// ---------------------------------------------------------------------------

describe('isCoreDisabled', () => {
  const core = makeCore('pulse_core', [0, 1]);

  it('returns true when all cells have been hit', () => {
    const shots: Shot[] = [makeShot(0, true), makeShot(1, true)];
    expect(isCoreDisabled(core, shots)).toBe(true);
  });

  it('returns false when only some cells have been hit', () => {
    const shots: Shot[] = [makeShot(0, true)];
    expect(isCoreDisabled(core, shots)).toBe(false);
  });

  it('returns false when no cells have been hit', () => {
    expect(isCoreDisabled(core, [])).toBe(false);
  });

  it('ignores miss shots when counting hits', () => {
    // Cell 0 was missed (hit=false), cell 1 was hit — core not fully disabled
    const shots: Shot[] = [makeShot(0, false), makeShot(1, true)];
    expect(isCoreDisabled(core, shots)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkWinCondition
// ---------------------------------------------------------------------------

describe('checkWinCondition', () => {
  it('returns true when all cores are fully disabled', () => {
    const board = makeBoard([makeCore('pulse_core', [0, 1])]);
    const shots: Shot[] = [makeShot(0, true), makeShot(1, true)];
    expect(checkWinCondition(board, shots)).toBe(true);
  });

  it('returns false when at least one core still has un-hit cells', () => {
    const board = makeBoard([
      makeCore('pulse_core', [0, 1]),
      makeCore('dark_core_a', [10, 11, 12]),
    ]);
    // Only pulse_core is fully hit
    const shots: Shot[] = [makeShot(0, true), makeShot(1, true)];
    expect(checkWinCondition(board, shots)).toBe(false);
  });

  it('returns true when board has no cores (edge case)', () => {
    expect(checkWinCondition(makeBoard([]), [])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildCellStates
// ---------------------------------------------------------------------------

describe('buildCellStates', () => {
  const core = makeCore('pulse_core', [0, 1]);
  const board = makeBoard([core]);

  it('always returns exactly 100 cell states', () => {
    expect(buildCellStates(board, [], true)).toHaveLength(GRID_SIZE * GRID_SIZE);
    expect(buildCellStates(null, [], false)).toHaveLength(GRID_SIZE * GRID_SIZE);
  });

  it('each state carries the correct index', () => {
    const states = buildCellStates(null, [], false);
    states.forEach((s, i) => expect(s.index).toBe(i));
  });

  it('revealCores=true: core cells have hasCore=true', () => {
    const states = buildCellStates(board, [], true);
    expect(states[0].hasCore).toBe(true);
    expect(states[1].hasCore).toBe(true);
    expect(states[2].hasCore).toBe(false);
  });

  it('revealCores=false: all cells have hasCore=false', () => {
    const states = buildCellStates(board, [], false);
    expect(states.every((s) => !s.hasCore)).toBe(true);
  });

  it('hit cell has isHit=true and isMiss=false', () => {
    const states = buildCellStates(board, [makeShot(0, true)], true);
    expect(states[0].isHit).toBe(true);
    expect(states[0].isMiss).toBe(false);
  });

  it('miss cell has isMiss=true and isHit=false', () => {
    const states = buildCellStates(board, [makeShot(5, false)], true);
    expect(states[5].isMiss).toBe(true);
    expect(states[5].isHit).toBe(false);
  });

  it('fully disabled core cells have isDisabled=true', () => {
    const shots: Shot[] = [makeShot(0, true), makeShot(1, true)];
    const states = buildCellStates(board, shots, true);
    expect(states[0].isDisabled).toBe(true);
    expect(states[1].isDisabled).toBe(true);
  });

  it('partially hit core cells are not yet disabled', () => {
    const states = buildCellStates(board, [makeShot(0, true)], true);
    expect(states[0].isDisabled).toBe(false);
    expect(states[1].isDisabled).toBe(false);
  });

  it('null board returns all cells with hasCore=false', () => {
    const states = buildCellStates(null, [], true);
    expect(states.every((s) => !s.hasCore)).toBe(true);
  });
});
