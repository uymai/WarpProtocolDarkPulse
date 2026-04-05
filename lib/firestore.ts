import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  setDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GameDocument, PendingShot, PlacedCore, PrivateBoard, Shot } from '@/types/game';
import { checkHit, checkWinCondition, isValidPlacement } from '@/lib/gameLogic';

const GAMES = 'games';
const BOARDS = 'boards';

/** Firestore grid index must be within a 10×10 board. */
function assertValidIndex(index: number): void {
  if (!Number.isInteger(index) || index < 0 || index > 99) {
    throw new Error('Invalid shot index');
  }
}

function toGameDocument(id: string, data: Record<string, unknown>): GameDocument {
  return {
    gameId: id,
    phase: (data.phase as GameDocument['phase']) ?? 'waiting',
    createdAt: (data.createdAt as number) ?? 0,
    playerOne: (data.playerOne as string | null) ?? null,
    playerTwo: (data.playerTwo as string | null) ?? null,
    boardOnePlaced: (data.boardOnePlaced as boolean) ?? false,
    boardTwoPlaced: (data.boardTwoPlaced as boolean) ?? false,
    shotsByOne: Array.isArray(data.shotsByOne) ? (data.shotsByOne as Shot[]) : [],
    shotsByTwo: Array.isArray(data.shotsByTwo) ? (data.shotsByTwo as Shot[]) : [],
    currentTurn: (data.currentTurn as string | null) ?? null,
    winner: (data.winner as string | null) ?? null,
    pendingShot: (data.pendingShot as PendingShot | null) ?? null,
  };
}

export async function createGame(playerOneId: string): Promise<string> {
  const ref = doc(collection(db, GAMES));
  await setDoc(ref, {
    phase: 'waiting',
    createdAt: Date.now(),
    playerOne: playerOneId,
    playerTwo: null,
    boardOnePlaced: false,
    boardTwoPlaced: false,
    shotsByOne: [],
    shotsByTwo: [],
    currentTurn: null,
    winner: null,
    pendingShot: null,
  });
  return ref.id;
}

export async function joinGame(gameId: string, playerTwoId: string): Promise<void> {
  const ref = doc(db, GAMES, gameId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Game not found');
    const data = snap.data();
    if (data.phase !== 'waiting') throw new Error('Game is no longer accepting players');
    if (data.playerTwo !== null) throw new Error('Game is already full');
    if (data.playerOne === playerTwoId) throw new Error('Cannot join your own game');
    tx.update(ref, { playerTwo: playerTwoId, phase: 'placement' });
  });
}

/**
 * Stores the player's board in a private sub-collection readable only by that player.
 * Core positions are never written to the main game document.
 */
export async function placeBoard(
  gameId: string,
  playerId: string,
  cores: PlacedCore[]
): Promise<void> {
  if (!isValidPlacement(cores)) throw new Error('Invalid board placement');

  const gameRef = doc(db, GAMES, gameId);
  const boardRef = doc(db, GAMES, gameId, BOARDS, playerId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists()) throw new Error('Game not found');
    const data = snap.data();
    if (data.phase !== 'placement') throw new Error('Not in placement phase');

    const isPlayerOne = data.playerOne === playerId;
    const isPlayerTwo = data.playerTwo === playerId;
    if (!isPlayerOne && !isPlayerTwo) throw new Error('Not a participant');

    const updateKey = isPlayerOne ? 'boardOnePlaced' : 'boardTwoPlaced';
    const otherPlaced = isPlayerOne ? data.boardTwoPlaced : data.boardOnePlaced;

    const updates: Record<string, unknown> = { [updateKey]: true };
    if (otherPlaced) {
      updates.phase = 'playing';
      updates.currentTurn = data.playerOne;
    }

    // Board stored privately — only accessible by this player via Firestore rules
    tx.set(boardRef, { playerId, cores } satisfies PrivateBoard);
    tx.update(gameRef, updates);
  });
}

/**
 * Records the attacker's shot index as a pending shot.
 * Hit/miss resolution is intentionally deferred to the DEFENDER via resolveShot(),
 * so the attacker cannot fabricate hits against an opponent's hidden board.
 */
export async function fireShot(
  gameId: string,
  shooterId: string,
  index: number
): Promise<void> {
  assertValidIndex(index);

  const ref = doc(db, GAMES, gameId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Game not found');
    const data = snap.data();

    if (data.phase !== 'playing') throw new Error('Game is not in playing phase');
    if (data.currentTurn !== shooterId) throw new Error('Not your turn');
    if (data.pendingShot !== null) throw new Error('A shot is already pending resolution');

    const isPlayerOne = data.playerOne === shooterId;
    const existingShots: Shot[] = isPlayerOne
      ? (Array.isArray(data.shotsByOne) ? data.shotsByOne : [])
      : (Array.isArray(data.shotsByTwo) ? data.shotsByTwo : []);

    if (existingShots.some((s: Shot) => s.index === index)) {
      throw new Error('Already shot at this cell');
    }

    const pending: PendingShot = { index, shooterId, timestamp: Date.now() };
    tx.update(ref, { pendingShot: pending });
  });
}

/**
 * Called by the DEFENDING player to resolve a pending shot against their private board.
 * The defender reads their own private board (not accessible to the attacker) and
 * computes the true hit/miss result, then writes it to the game document.
 */
export async function resolveShot(
  gameId: string,
  defenderId: string,
  privateBoard: PrivateBoard
): Promise<void> {
  const ref = doc(db, GAMES, gameId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Game not found');
    const data = snap.data();

    if (data.phase !== 'playing') throw new Error('Game is not in playing phase');

    const pending: PendingShot | null = data.pendingShot ?? null;
    if (!pending) throw new Error('No pending shot to resolve');

    const isDefenderOne = data.playerOne === defenderId;
    const isDefenderTwo = data.playerTwo === defenderId;
    if (!isDefenderOne && !isDefenderTwo) throw new Error('Not a participant');

    // The shooter must be the OTHER player
    if (pending.shooterId === defenderId) throw new Error('Cannot resolve your own shot');

    const isShooterOne = data.playerOne === pending.shooterId;
    const shotsKey = isShooterOne ? 'shotsByOne' : 'shotsByTwo';
    const existingShots: Shot[] = isShooterOne
      ? (Array.isArray(data.shotsByOne) ? data.shotsByOne : [])
      : (Array.isArray(data.shotsByTwo) ? data.shotsByTwo : []);

    if (existingShots.some((s: Shot) => s.index === pending.index)) {
      throw new Error('Shot index already resolved');
    }

    // Defender computes hit/miss using their private board
    const { hit, coreHit } = checkHit(pending.index, {
      playerId: privateBoard.playerId,
      cores: privateBoard.cores,
      placementComplete: true,
    });

    const shot: Shot = { index: pending.index, hit, coreHit, timestamp: pending.timestamp };
    const updatedShots = [...existingShots, shot];

    const updates: Record<string, unknown> = {
      [shotsKey]: updatedShots,
      pendingShot: null,
    };

    // Check win condition
    if (hit && checkWinCondition(
      { playerId: privateBoard.playerId, cores: privateBoard.cores, placementComplete: true },
      updatedShots
    )) {
      updates.phase = 'finished';
      updates.winner = pending.shooterId;
      updates.currentTurn = null;
      tx.update(ref, updates);
      return;
    }

    updates.currentTurn = isShooterOne ? data.playerTwo : data.playerOne;
    tx.update(ref, updates);
  });
}

/**
 * Subscribes to the player's own private board sub-document.
 */
export function subscribeToPrivateBoard(
  gameId: string,
  playerId: string,
  callback: (board: PrivateBoard | null) => void
): Unsubscribe {
  const ref = doc(db, GAMES, gameId, BOARDS, playerId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as PrivateBoard);
    } else {
      callback(null);
    }
  });
}

export function subscribeToGame(
  gameId: string,
  callback: (game: GameDocument) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const ref = doc(db, GAMES, gameId);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        callback(toGameDocument(snap.id, snap.data() as Record<string, unknown>));
      }
    },
    onError
  );
}

export async function getGame(gameId: string): Promise<GameDocument | null> {
  const ref = doc(db, GAMES, gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toGameDocument(snap.id, snap.data() as Record<string, unknown>);
}
