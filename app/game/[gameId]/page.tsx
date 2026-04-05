'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getOrCreatePlayerId } from '@/lib/uuid';
import { subscribeToGame, placeBoard, fireShot, joinGame } from '@/lib/firestore';
import { GameDocument, PlacedCore, CoreType, Orientation, Shot } from '@/types/game';
import {
  CORE_DEFINITIONS,
  buildCellStates,
  cellsForCore,
  isValidPlacement,
  isCoreDisabled,
} from '@/lib/gameLogic';
import Grid from '@/components/Grid';
import CorePlacer from '@/components/CorePlacer';
import CoreStatusPanel from '@/components/CoreStatusPanel';
import GameStatusBar from '@/components/GameStatusBar';
import ShotResult from '@/components/ShotResult';

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();

  const [playerId, setPlayerId] = useState('');
  const [game, setGame] = useState<GameDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Placement state
  const [selectedCore, setSelectedCore] = useState<CoreType | null>(null);
  const [orientation, setOrientation] = useState<Orientation>('horizontal');
  const [stagedCores, setStagedCores] = useState<PlacedCore[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Shot result notification
  const [shotResultTrigger, setShotResultTrigger] = useState(0);
  const [lastShot, setLastShot] = useState<Shot | null>(null);
  const [lastShotCoreDisabled, setLastShotCoreDisabled] = useState(false);
  const prevShotsLengthRef = useRef<number>(0);

  // Clipboard copy state
  const [copied, setCopied] = useState(false);

  // Auto-join guard — prevent duplicate join attempts
  const autoJoinAttemptedRef = useRef(false);

  // Init player ID
  useEffect(() => {
    setPlayerId(getOrCreatePlayerId());
  }, []);

  // Subscribe to game
  useEffect(() => {
    if (!gameId) return;
    const unsub = subscribeToGame(
      gameId,
      (g) => {
        setGame(g);
        setLoading(false);
      },
      (err) => {
        setError('Connection error — ' + err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [gameId]);

  // Auto-join when arriving via invite link during waiting phase
  useEffect(() => {
    if (!game || !playerId) return;
    const isParticipant = game.playerOne === playerId || game.playerTwo === playerId;
    if (
      game.phase === 'waiting' &&
      !isParticipant &&
      !autoJoinAttemptedRef.current
    ) {
      autoJoinAttemptedRef.current = true;
      joinGame(gameId, playerId).catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to join game.');
      });
    }
  }, [game, playerId, gameId]);

  // Detect new shot for notification
  useEffect(() => {
    if (!game || !playerId) return;
    const isPlayerOne = game.playerOne === playerId;
    // We want to notify the current player about shots THEY fired
    const myShots = isPlayerOne ? game.shotsByOne : game.shotsByTwo;
    const opponentBoard = isPlayerOne ? game.boardTwo : game.boardOne;

    if (myShots.length > prevShotsLengthRef.current && myShots.length > 0) {
      const shot = myShots[myShots.length - 1];
      let coreDisabled = false;
      if (shot.hit && shot.coreHit && opponentBoard) {
        const core = opponentBoard.cores.find((c) => c.id === shot.coreHit);
        if (core) coreDisabled = isCoreDisabled(core, myShots);
      }
      setLastShot(shot);
      setLastShotCoreDisabled(coreDisabled);
      setShotResultTrigger((t) => t + 1);
    }
    prevShotsLengthRef.current = myShots.length;
  }, [game, playerId]);

  const playerSlot = game
    ? game.playerOne === playerId
      ? 'one'
      : game.playerTwo === playerId
      ? 'two'
      : null
    : null;

  const myBoard = playerSlot === 'one' ? game?.boardOne : game?.boardTwo;
  const opponentBoard = playerSlot === 'one' ? game?.boardTwo : game?.boardOne;
  const myShots = playerSlot === 'one' ? (game?.shotsByOne ?? []) : (game?.shotsByTwo ?? []);
  const opponentShots = playerSlot === 'one' ? (game?.shotsByTwo ?? []) : (game?.shotsByOne ?? []);

  // Cells for own board (reveal cores, show where opponent shot)
  const ownCells = buildCellStates(myBoard ?? null, opponentShots, true);
  // Cells for attack grid (hide opponent cores, show my shots)
  const attackCells = buildCellStates(opponentBoard ?? null, myShots, false);

  // Placement preview
  const pendingCells =
    selectedCore && hoverIndex !== null
      ? cellsForCore(
          hoverIndex,
          CORE_DEFINITIONS.find((d) => d.id === selectedCore)!.size,
          orientation
        )
      : [];

  const pendingValid =
    pendingCells.length > 0 &&
    !pendingCells.some((cell) =>
      stagedCores.some((placed) => placed.cells.includes(cell))
    );

  function handlePlacementClick(index: number) {
    if (!selectedCore) return;
    const def = CORE_DEFINITIONS.find((d) => d.id === selectedCore)!;
    const cells = cellsForCore(index, def.size, orientation);
    if (cells.length === 0) return;

    // Check overlap
    const hasOverlap = cells.some((cell) =>
      stagedCores.some((placed) => placed.cells.includes(cell))
    );
    if (hasOverlap) return;

    const newCore: PlacedCore = {
      id: selectedCore,
      cells,
      orientation,
      disabled: false,
    };

    // Remove previous placement of same core (if re-placing)
    setStagedCores((prev) => [
      ...prev.filter((c) => c.id !== selectedCore),
      newCore,
    ]);
    // Auto-select next unplaced core
    const allIds = CORE_DEFINITIONS.map((d) => d.id);
    const newPlacedIds = new Set([...stagedCores.filter((c) => c.id !== selectedCore).map((c) => c.id), selectedCore]);
    const next = allIds.find((id) => !newPlacedIds.has(id));
    setSelectedCore(next ?? null);
  }

  function handleRemovePlacement(index: number) {
    const coreAtCell = stagedCores.find((c) => c.cells.includes(index));
    if (coreAtCell) {
      setStagedCores((prev) => prev.filter((c) => c.id !== coreAtCell.id));
      setSelectedCore(coreAtCell.id);
    }
  }

  async function handleConfirmPlacement() {
    if (!isValidPlacement(stagedCores) || submitting) return;
    setSubmitting(true);
    try {
      await placeBoard(gameId, playerId, stagedCores);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to place board.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAttackClick(index: number) {
    if (!game || game.currentTurn !== playerId) return;
    if (myShots.some((s) => s.index === index)) return;
    try {
      await fireShot(gameId, playerId, index);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Shot failed.');
    }
  }

  async function copyInviteLink() {
    const url = `${window.location.origin}/game/${gameId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // --- Render ---

  if (loading || !playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-dp-accent/60 font-orbitron tracking-widest animate-pulse"
          style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem' }}>
          SYNCING WITH GRID...
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-dp-hit font-orbitron tracking-widest"
          style={{ fontFamily: 'Orbitron, sans-serif' }}>
          PROTOCOL NOT FOUND
        </div>
        <button onClick={() => router.push('/')} className="btn-cyber text-xs">
          RETURN TO BASE
        </button>
      </div>
    );
  }

  if (playerSlot === null && game.phase !== 'waiting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-dp-hit font-orbitron tracking-widest"
          style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem' }}>
          ACCESS DENIED — PROTOCOL SEALED
        </div>
        <button onClick={() => router.push('/')} className="btn-cyber text-xs">
          RETURN TO BASE
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-dp-border px-6 py-3 flex items-center justify-between">
        <div>
          <span
            className="font-orbitron font-bold text-dp-accent tracking-widest uppercase"
            style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem',
              textShadow: '0 0 15px rgba(0,240,255,0.5)' }}
          >
            Warp Protocol
          </span>
          <span
            className="font-orbitron text-dp-hit ml-2 tracking-widest uppercase"
            style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem' }}
          >
            Dark Pulse
          </span>
        </div>
        <button onClick={() => router.push('/')} className="text-dp-text/30 hover:text-dp-text/70 text-xs font-mono transition-colors">
          ← EXIT
        </button>
      </header>

      <GameStatusBar
        phase={game.phase}
        currentTurn={game.currentTurn}
        playerId={playerId}
        winner={game.winner}
        playerOneId={game.playerOne}
      />

      {/* Shot result overlay */}
      {lastShot && (
        <ShotResult
          hit={lastShot.hit}
          coreHit={lastShot.coreHit}
          coreDisabled={lastShotCoreDisabled}
          triggerKey={shotResultTrigger}
        />
      )}

      {/* Error */}
      {error && (
        <div className="mx-6 mt-2 border border-dp-hit/50 bg-dp-hit/10 text-dp-hit px-3 py-2 text-xs font-mono">
          ⚠ {error}
          <button onClick={() => setError(null)} className="ml-3 text-dp-hit/60 hover:text-dp-hit">✕</button>
        </div>
      )}

      {/* WAITING phase */}
      {game.phase === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
          <div className="text-center">
            <div
              className="text-dp-text/50 font-orbitron tracking-widest uppercase mb-4"
              style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem' }}
            >
              Awaiting Second Operative
            </div>
            <div className="flex gap-1 justify-center">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-dp-accent animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>

          <div className="text-center">
            <div
              className="text-dp-text/40 font-mono uppercase mb-2"
              style={{ fontSize: '0.6rem', letterSpacing: '0.15em' }}
            >
              Invite Link
            </div>
            <button
              onClick={copyInviteLink}
              className="border border-dp-accent bg-dp-accent/5 px-8 py-3 font-orbitron tracking-widest text-dp-accent hover:bg-dp-accent/10 transition-all"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                boxShadow: '0 0 20px rgba(0,240,255,0.15)',
                fontSize: '0.75rem',
                letterSpacing: '0.2em',
              }}
            >
              {copied ? '✓ COPIED!' : 'COPY INVITE LINK'}
            </button>
            <div className="text-dp-text/30 text-xs font-mono mt-2">
              {copied ? 'Link copied — send it to your opponent' : 'Share this link with your opponent'}
            </div>
            <div className="text-dp-text/20 text-xs font-mono mt-3">
              or share code: {gameId}
            </div>
          </div>
        </div>
      )}

      {/* PLACEMENT phase */}
      {game.phase === 'placement' && (
        <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 px-4 py-8">
          {/* Sidebar */}
          <div className="order-2 lg:order-1">
            <CorePlacer
              coreDefs={CORE_DEFINITIONS}
              placedCores={stagedCores}
              selectedCore={selectedCore}
              orientation={orientation}
              onSelectCore={setSelectedCore}
              onToggleOrientation={() =>
                setOrientation((o) => (o === 'horizontal' ? 'vertical' : 'horizontal'))
              }
              onConfirmPlacement={handleConfirmPlacement}
            />
            {submitting && (
              <div className="text-dp-accent/60 text-xs font-mono mt-2 animate-pulse">
                DEPLOYING CORES...
              </div>
            )}
            {myBoard?.placementComplete && (
              <div className="text-green-400 text-xs font-mono mt-2 border border-green-700 px-2 py-1">
                ✓ CORES DEPLOYED — AWAITING OPPONENT
              </div>
            )}
          </div>

          {/* Grid */}
          <div className="order-1 lg:order-2">
            {myBoard?.placementComplete ? (
              // Show confirmed board
              <Grid
                cells={ownCells}
                mode="view"
                label="YOUR SYSTEM — DEPLOYED"
              />
            ) : (
              <Grid
                cells={buildCellStates(
                  stagedCores.length > 0 ? { playerId, cores: stagedCores, placementComplete: false } : null,
                  [],
                  true
                )}
                mode="placement"
                onCellClick={(index) => {
                  const coreAtCell = stagedCores.find((c) => c.cells.includes(index));
                  if (coreAtCell) {
                    handleRemovePlacement(index);
                  } else {
                    handlePlacementClick(index);
                  }
                }}
                onCellHover={setHoverIndex}
                pendingCells={pendingCells}
                pendingValid={pendingValid}
                label="YOUR SYSTEM — PLACE CORES"
              />
            )}
          </div>
        </div>
      )}

      {/* PLAYING / FINISHED phase */}
      {(game.phase === 'playing' || game.phase === 'finished') && (
        <div className="flex-1 flex flex-col items-center gap-6 px-4 py-6">
          <div className="flex flex-col xl:flex-row gap-8 items-start justify-center w-full">
            {/* Own board + status */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <CoreStatusPanel
                label="YOUR CORES"
                cores={myBoard?.cores ?? []}
                shots={opponentShots}
              />
              <Grid
                cells={ownCells}
                mode="view"
                label="YOUR SYSTEM"
              />
            </div>

            {/* Divider */}
            <div className="hidden xl:flex flex-col items-center justify-center self-stretch gap-2 px-4">
              <div className="flex-1 w-px bg-dp-border" />
              <span
                className="text-dp-text/20 font-orbitron tracking-widest"
                style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.5rem' }}
              >
                VS
              </span>
              <div className="flex-1 w-px bg-dp-border" />
            </div>

            {/* Attack board + status */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <Grid
                cells={attackCells}
                mode={game.phase === 'playing' && game.currentTurn === playerId ? 'attack' : 'view'}
                onCellClick={handleAttackClick}
                disabled={game.currentTurn !== playerId || game.phase !== 'playing'}
                label="TARGET SYSTEM"
              />
              <CoreStatusPanel
                label="ENEMY CORES"
                cores={opponentBoard?.cores ?? []}
                shots={myShots}
              />
            </div>
          </div>

          {/* Finished — new game */}
          {game.phase === 'finished' && (
            <button
              onClick={() => router.push('/')}
              className="btn-cyber mt-4"
              style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem' }}
            >
              INITIALIZE NEW PROTOCOL
            </button>
          )}
        </div>
      )}
    </div>
  );
}
