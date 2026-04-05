/**
 * Turn-state and game-flow tests for lib/firestore.ts.
 *
 * Firebase is fully mocked so no real Firestore connection is needed.
 * The real application logic inside each transaction callback (checkHit,
 * isCoreDisabled, checkWinCondition, turn switching) still executes verbatim.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runTransaction, addDoc } from 'firebase/firestore';

// ─── Mocks must be declared before any imports that use them ────────────────

vi.mock('@/lib/firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'mock-doc-ref'),
  addDoc: vi.fn(),
  collection: vi.fn(() => 'mock-collection-ref'),
  onSnapshot: vi.fn(),
  getDoc: vi.fn(),
  runTransaction: vi.fn(),
}));

// ─── Now import the functions under test ────────────────────────────────────

import { createGame, joinGame, placeBoard, fireShot } from '@/lib/firestore';
import type { PlacedCore } from '@/types/game';

// ─── Test fixtures ───────────────────────────────────────────────────────────

const PLAYER_ONE = 'player-one-uuid';
const PLAYER_TWO = 'player-two-uuid';
const GAME_ID = 'game-abc';

function makeCore(
  id: PlacedCore['id'],
  cells: number[],
  orientation: PlacedCore['orientation'] = 'horizontal'
): PlacedCore {
  return { id, cells, orientation, disabled: false };
}

/** Minimal board with a single 2-cell pulse_core at cells [0,1]. */
function minimalBoardData(playerId: string) {
  return {
    playerId,
    placementComplete: true,
    cores: [makeCore('pulse_core', [0, 1])],
  };
}

/**
 * Full board data with all 5 core types — needed where isValidPlacement is
 * called indirectly, but mainly used to give the shot-resolution code real
 * core data it can search through.
 */
function fullBoardData(playerId: string) {
  return {
    playerId,
    placementComplete: true,
    cores: [
      makeCore('pulse_core', [0, 1]),
      makeCore('dark_core_a', [10, 11, 12]),
      makeCore('dark_core_b', [20, 21, 22]),
      makeCore('warp_core', [30, 31, 32, 33]),
      makeCore('singularity_core', [40, 41, 42, 43, 44]),
    ],
  };
}

/** Base Firestore document shape used across playing-phase tests. */
function playingSnap(overrides: Record<string, unknown> = {}) {
  return {
    phase: 'playing',
    playerOne: PLAYER_ONE,
    playerTwo: PLAYER_TWO,
    currentTurn: PLAYER_ONE,
    boardOne: fullBoardData(PLAYER_ONE),
    boardTwo: fullBoardData(PLAYER_TWO),
    shotsByOne: [],
    shotsByTwo: [],
    winner: null,
    ...overrides,
  };
}

// ─── Mock helpers ────────────────────────────────────────────────────────────

const mockedRunTransaction = vi.mocked(runTransaction);

/**
 * Sets up runTransaction to execute the real callback with a fake Firestore
 * transaction object. All tx.update calls are captured for assertion.
 */
function setupTransaction(snapData: Record<string, unknown>) {
  const capturedUpdates: Record<string, unknown>[] = [];
  const tx = {
    get: vi.fn().mockResolvedValue({
      exists: () => true,
      data: () => snapData,
    }),
    update: vi.fn((_ref: unknown, updates: Record<string, unknown>) => {
      capturedUpdates.push(updates);
    }),
  };
  mockedRunTransaction.mockImplementation(async (_db: unknown, fn: (tx: unknown) => Promise<void>) => {
    await fn(tx);
  });
  return capturedUpdates;
}

function setupMissingGame() {
  const tx = {
    get: vi.fn().mockResolvedValue({ exists: () => false }),
    update: vi.fn(),
  };
  mockedRunTransaction.mockImplementation(async (_db: unknown, fn: (tx: unknown) => Promise<void>) => {
    await fn(tx);
  });
}

// ─── createGame ──────────────────────────────────────────────────────────────

describe('createGame', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls addDoc with the correct initial shape', async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: GAME_ID } as any);
    const id = await createGame(PLAYER_ONE);
    expect(id).toBe(GAME_ID);
    const [, docData] = vi.mocked(addDoc).mock.calls[0];
    expect(docData).toMatchObject({
      phase: 'waiting',
      playerOne: PLAYER_ONE,
      playerTwo: null,
      currentTurn: null,
      winner: null,
      shotsByOne: [],
      shotsByTwo: [],
    });
  });
});

// ─── joinGame ────────────────────────────────────────────────────────────────

describe('joinGame', () => {
  beforeEach(() => vi.clearAllMocks());

  it('transitions phase to placement when a second player joins', async () => {
    const updates = setupTransaction({
      phase: 'waiting',
      playerOne: PLAYER_ONE,
      playerTwo: null,
    });
    await joinGame(GAME_ID, PLAYER_TWO);
    expect(updates[0]).toMatchObject({ playerTwo: PLAYER_TWO, phase: 'placement' });
  });

  it('throws when game is not in waiting phase', async () => {
    setupTransaction({ phase: 'placement', playerOne: PLAYER_ONE, playerTwo: null });
    await expect(joinGame(GAME_ID, PLAYER_TWO)).rejects.toThrow(
      'Game is no longer accepting players'
    );
  });

  it('throws when a player tries to join their own game', async () => {
    setupTransaction({ phase: 'waiting', playerOne: PLAYER_ONE, playerTwo: null });
    await expect(joinGame(GAME_ID, PLAYER_ONE)).rejects.toThrow('Cannot join your own game');
  });

  it('throws when game is already full', async () => {
    setupTransaction({ phase: 'waiting', playerOne: PLAYER_ONE, playerTwo: PLAYER_TWO });
    await expect(joinGame(GAME_ID, 'third-player')).rejects.toThrow('Game is already full');
  });
});

// ─── placeBoard ──────────────────────────────────────────────────────────────

describe('placeBoard', () => {
  beforeEach(() => vi.clearAllMocks());

  const cores = fullBoardData(PLAYER_ONE).cores;

  it('stores the board without starting the game when the other player has not placed yet', async () => {
    const updates = setupTransaction({
      phase: 'placement',
      playerOne: PLAYER_ONE,
      playerTwo: PLAYER_TWO,
      boardOne: null,
      boardTwo: null,
    });
    await placeBoard(GAME_ID, PLAYER_ONE, cores);
    expect(updates[0]).not.toHaveProperty('phase');
    expect(updates[0]).not.toHaveProperty('currentTurn');
  });

  it('starts the game with playerOne\'s turn when both players have placed', async () => {
    // playerTwo places second; boardOne is already complete
    const updates = setupTransaction({
      phase: 'placement',
      playerOne: PLAYER_ONE,
      playerTwo: PLAYER_TWO,
      boardOne: { ...fullBoardData(PLAYER_ONE), placementComplete: true },
      boardTwo: null,
    });
    await placeBoard(GAME_ID, PLAYER_TWO, fullBoardData(PLAYER_TWO).cores);
    expect(updates[0]).toMatchObject({
      phase: 'playing',
      currentTurn: PLAYER_ONE,
    });
  });

  it('starts the game with playerOne\'s turn when playerOne places second', async () => {
    // playerOne places second; boardTwo is already complete
    const updates = setupTransaction({
      phase: 'placement',
      playerOne: PLAYER_ONE,
      playerTwo: PLAYER_TWO,
      boardOne: null,
      boardTwo: { ...fullBoardData(PLAYER_TWO), placementComplete: true },
    });
    await placeBoard(GAME_ID, PLAYER_ONE, cores);
    expect(updates[0]).toMatchObject({
      phase: 'playing',
      currentTurn: PLAYER_ONE,
    });
  });

  it('throws when a non-participant tries to place', async () => {
    setupTransaction({
      phase: 'placement',
      playerOne: PLAYER_ONE,
      playerTwo: PLAYER_TWO,
      boardOne: null,
      boardTwo: null,
    });
    await expect(placeBoard(GAME_ID, 'intruder', cores)).rejects.toThrow('Not a participant');
  });
});

// ─── fireShot — turn switching (the reported bug) ───────────────────────────

describe('fireShot — turn switching', () => {
  beforeEach(() => vi.clearAllMocks());

  it('switches currentTurn from playerOne to playerTwo after a miss', async () => {
    const updates = setupTransaction(playingSnap({ currentTurn: PLAYER_ONE }));
    // Index 99 is empty on boardTwo (no core placed there)
    await fireShot(GAME_ID, PLAYER_ONE, 99);
    expect(updates[0].currentTurn).toBe(PLAYER_TWO);
  });

  it('switches currentTurn from playerTwo to playerOne after a miss', async () => {
    const updates = setupTransaction(
      playingSnap({ currentTurn: PLAYER_TWO, shotsByTwo: [] })
    );
    await fireShot(GAME_ID, PLAYER_TWO, 99);
    expect(updates[0].currentTurn).toBe(PLAYER_ONE);
  });

  it('switches currentTurn from playerOne to playerTwo after a hit', async () => {
    const updates = setupTransaction(playingSnap({ currentTurn: PLAYER_ONE }));
    // Index 0 is inside boardTwo's pulse_core [0,1]
    await fireShot(GAME_ID, PLAYER_ONE, 0);
    expect(updates[0].currentTurn).toBe(PLAYER_TWO);
  });

  it('switches currentTurn from playerTwo to playerOne after a hit', async () => {
    const updates = setupTransaction(
      playingSnap({ currentTurn: PLAYER_TWO, shotsByTwo: [] })
    );
    // Index 0 is inside boardOne's pulse_core [0,1]
    await fireShot(GAME_ID, PLAYER_TWO, 0);
    expect(updates[0].currentTurn).toBe(PLAYER_ONE);
  });

  it('currentTurn is always one of the two players after each shot — never a stranger', async () => {
    // Simulates a 4-shot alternating sequence and checks at every step.
    // This directly encodes the reported bug: both sides showing "other player's turn"
    // requires currentTurn to be neither playerOne nor playerTwo.

    let state = playingSnap({ currentTurn: PLAYER_ONE });

    for (let shotIndex = 50; shotIndex < 54; shotIndex++) {
      const shooter = state.currentTurn as string;
      const updates = setupTransaction(state);

      await fireShot(GAME_ID, shooter, shotIndex);

      const nextTurn = updates[0].currentTurn as string | null;
      expect([PLAYER_ONE, PLAYER_TWO]).toContain(nextTurn);

      // Advance the simulated state
      const shotsKey = shooter === PLAYER_ONE ? 'shotsByOne' : 'shotsByTwo';
      state = {
        ...state,
        currentTurn: nextTurn as string,
        [shotsKey]: [...(state[shotsKey] as []), { index: shotIndex, hit: false, coreHit: null, timestamp: 0 }],
      };
    }
  });
});

// ─── fireShot — validation ───────────────────────────────────────────────────

describe('fireShot — validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when the shooter is not the current turn player', async () => {
    setupTransaction(playingSnap({ currentTurn: PLAYER_ONE }));
    await expect(fireShot(GAME_ID, PLAYER_TWO, 0)).rejects.toThrow('Not your turn');
  });

  it('throws when the game is not in playing phase', async () => {
    setupTransaction(playingSnap({ phase: 'placement' }));
    await expect(fireShot(GAME_ID, PLAYER_ONE, 0)).rejects.toThrow(
      'Game is not in playing phase'
    );
  });

  it('throws when a player shoots at a cell they already targeted', async () => {
    setupTransaction(
      playingSnap({
        currentTurn: PLAYER_ONE,
        shotsByOne: [{ index: 5, hit: false, coreHit: null, timestamp: 0 }],
      })
    );
    await expect(fireShot(GAME_ID, PLAYER_ONE, 5)).rejects.toThrow('Already shot at this cell');
  });
});

// ─── fireShot — win condition ────────────────────────────────────────────────

describe('fireShot — win condition', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets phase=finished, winner=shooterId, currentTurn=null when all opponent cores are destroyed', async () => {
    // boardTwo has only pulse_core at [0,1]; cell 0 was already hit.
    const updates = setupTransaction(
      playingSnap({
        currentTurn: PLAYER_ONE,
        boardTwo: {
          playerId: PLAYER_TWO,
          placementComplete: true,
          cores: [makeCore('pulse_core', [0, 1])],
        },
        // cell 0 was already hit in a previous turn
        shotsByOne: [{ index: 0, hit: true, coreHit: 'pulse_core', timestamp: 0 }],
      })
    );

    // Firing at cell 1 completes the destruction of the last core
    await fireShot(GAME_ID, PLAYER_ONE, 1);

    expect(updates[0]).toMatchObject({
      phase: 'finished',
      winner: PLAYER_ONE,
      currentTurn: null,
    });
  });

  it('does not end the game after a partial hit (cores still alive)', async () => {
    const updates = setupTransaction(playingSnap({ currentTurn: PLAYER_ONE }));
    // Hit cell 0 of pulse_core [0,1] — one cell still alive
    await fireShot(GAME_ID, PLAYER_ONE, 0);
    expect(updates[0].phase).not.toBe('finished');
    expect(updates[0].winner).toBeUndefined();
    expect(updates[0].currentTurn).toBe(PLAYER_TWO);
  });
});

// ─── fireShot — board update on miss ─────────────────────────────────────────

describe('fireShot — board data', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not modify the opponent board document on a miss', async () => {
    const updates = setupTransaction(playingSnap({ currentTurn: PLAYER_ONE }));
    // Index 99 is empty on boardTwo
    await fireShot(GAME_ID, PLAYER_ONE, 99);
    expect(updates[0]).not.toHaveProperty('boardTwo');
    expect(updates[0]).not.toHaveProperty('boardOne');
  });

  it('updates the opponent board on a hit to mark the core disabled when all cells are hit', async () => {
    const updates = setupTransaction(
      playingSnap({
        currentTurn: PLAYER_ONE,
        boardTwo: {
          playerId: PLAYER_TWO,
          placementComplete: true,
          cores: [makeCore('pulse_core', [0, 1])],
        },
        shotsByOne: [{ index: 0, hit: true, coreHit: 'pulse_core', timestamp: 0 }],
      })
    );
    // Hitting last cell of pulse_core
    await fireShot(GAME_ID, PLAYER_ONE, 1);
    // Win ends the game, so boardTwo update is included in the winning update
    const pulseCore = (updates[0].boardTwo as any)?.cores?.find(
      (c: PlacedCore) => c.id === 'pulse_core'
    );
    expect(pulseCore?.disabled).toBe(true);
  });
});
