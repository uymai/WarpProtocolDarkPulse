import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GameDocument, PlacedCore, Shot } from '@/types/game';
import { checkHit, checkWinCondition, isCoreDisabled } from '@/lib/gameLogic';

const GAMES = 'games';

function toGameDocument(id: string, data: Record<string, unknown>): GameDocument {
  return {
    gameId: id,
    phase: (data.phase as GameDocument['phase']) ?? 'waiting',
    createdAt: (data.createdAt as number) ?? 0,
    playerOne: (data.playerOne as string | null) ?? null,
    playerTwo: (data.playerTwo as string | null) ?? null,
    boardOne: (data.boardOne as GameDocument['boardOne']) ?? null,
    boardTwo: (data.boardTwo as GameDocument['boardTwo']) ?? null,
    shotsByOne: (data.shotsByOne as Shot[]) ?? [],
    shotsByTwo: (data.shotsByTwo as Shot[]) ?? [],
    currentTurn: (data.currentTurn as string | null) ?? null,
    winner: (data.winner as string | null) ?? null,
  };
}

export async function createGame(playerOneId: string): Promise<string> {
  const ref = await addDoc(collection(db, GAMES), {
    phase: 'waiting',
    createdAt: Date.now(),
    playerOne: playerOneId,
    playerTwo: null,
    boardOne: null,
    boardTwo: null,
    shotsByOne: [],
    shotsByTwo: [],
    currentTurn: null,
    winner: null,
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

export async function placeBoard(
  gameId: string,
  playerId: string,
  cores: PlacedCore[]
): Promise<void> {
  const ref = doc(db, GAMES, gameId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Game not found');
    const data = snap.data();
    if (data.phase !== 'placement') throw new Error('Not in placement phase');

    const isPlayerOne = data.playerOne === playerId;
    const isPlayerTwo = data.playerTwo === playerId;
    if (!isPlayerOne && !isPlayerTwo) throw new Error('Not a participant');

    const board = { playerId, cores, placementComplete: true };
    const updateKey = isPlayerOne ? 'boardOne' : 'boardTwo';
    const otherBoard = isPlayerOne ? data.boardTwo : data.boardOne;

    const updates: Record<string, unknown> = { [updateKey]: board };

    // If the other player already completed placement, start the game
    if (otherBoard?.placementComplete) {
      updates.phase = 'playing';
      updates.currentTurn = data.playerOne;
    }

    tx.update(ref, updates);
  });
}

export async function fireShot(
  gameId: string,
  shooterId: string,
  index: number
): Promise<void> {
  const ref = doc(db, GAMES, gameId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Game not found');
    const data = snap.data();

    if (data.phase !== 'playing') throw new Error('Game is not in playing phase');
    if (data.currentTurn !== shooterId) throw new Error('Not your turn');

    const isPlayerOne = data.playerOne === shooterId;
    const opponentBoard = isPlayerOne ? data.boardTwo : data.boardOne;
    const shotsKey = isPlayerOne ? 'shotsByOne' : 'shotsByTwo';
    const opponentBoardKey = isPlayerOne ? 'boardTwo' : 'boardOne';
    const existingShots: Shot[] = isPlayerOne ? (data.shotsByOne ?? []) : (data.shotsByTwo ?? []);

    // Prevent duplicate shots
    if (existingShots.some((s: Shot) => s.index === index)) {
      throw new Error('Already shot at this cell');
    }

    const { hit, coreHit } = checkHit(index, opponentBoard);
    const shot: Shot = { index, hit, coreHit, timestamp: Date.now() };
    const updatedShots = [...existingShots, shot];

    const updates: Record<string, unknown> = {
      [shotsKey]: updatedShots,
    };

    // Update disabled status on the opponent's board
    if (hit && coreHit) {
      const updatedCores = opponentBoard.cores.map((core: PlacedCore) => {
        if (core.id === coreHit) {
          const disabled = isCoreDisabled(core, updatedShots);
          return { ...core, disabled };
        }
        return core;
      });
      updates[opponentBoardKey] = { ...opponentBoard, cores: updatedCores };

      // Check win condition
      const updatedBoard = { ...opponentBoard, cores: updatedCores };
      if (checkWinCondition(updatedBoard, updatedShots)) {
        updates.phase = 'finished';
        updates.winner = shooterId;
        updates.currentTurn = null;
        tx.update(ref, updates);
        return;
      }
    }

    updates.currentTurn = isPlayerOne ? data.playerTwo : data.playerOne;
    tx.update(ref, updates);
  });
}

export function subscribeToGame(
  gameId: string,
  callback: (game: GameDocument) => void
): Unsubscribe {
  const ref = doc(db, GAMES, gameId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(toGameDocument(snap.id, snap.data() as Record<string, unknown>));
    }
  });
}

export async function getGame(gameId: string): Promise<GameDocument | null> {
  const ref = doc(db, GAMES, gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toGameDocument(snap.id, snap.data() as Record<string, unknown>);
}
