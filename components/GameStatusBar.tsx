'use client';

import { GamePhase } from '@/types/game';

interface GameStatusBarProps {
  phase: GamePhase;
  currentTurn: string | null;
  playerId: string;
  winner: string | null;
  playerOneId: string | null;
}

export default function GameStatusBar({
  phase,
  currentTurn,
  playerId,
  winner,
  playerOneId,
}: GameStatusBarProps) {
  if (phase === 'finished') {
    const isWinner = winner === playerId;
    return (
      <div
        className={`w-full py-3 px-6 text-center font-orbitron tracking-widest uppercase animate-flicker ${
          isWinner
            ? 'bg-dp-accent/10 border border-dp-accent text-dp-accent'
            : 'bg-dp-hit/10 border border-dp-hit text-dp-hit'
        }`}
        style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: '0.85rem',
          boxShadow: isWinner
            ? '0 0 20px rgba(0,240,255,0.3)'
            : '0 0 20px rgba(255,0,60,0.3)',
        }}
      >
        {isWinner ? '⬡ SYSTEM BREACH COMPLETE — VICTORY ⬡' : '⬡ ALL CORES DISABLED — SYSTEM FAILURE ⬡'}
      </div>
    );
  }

  if (phase === 'playing') {
    const isMyTurn = currentTurn === playerId;
    return (
      <div
        className={`w-full py-2 px-6 flex items-center justify-center gap-3 border-b ${
          isMyTurn ? 'border-dp-accent/30' : 'border-dp-border'
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-dp-accent animate-pulse' : 'bg-dp-text/20'}`}
        />
        <span
          className={`font-orbitron tracking-widest uppercase text-sm ${
            isMyTurn ? 'text-dp-accent' : 'text-dp-text/40'
          }`}
          style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem' }}
        >
          {isMyTurn ? 'YOUR TURN — FIRE AT WILL' : 'STANDBY — ENEMY TARGETING'}
        </span>
        <div
          className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-dp-accent animate-pulse' : 'bg-dp-text/20'}`}
        />
      </div>
    );
  }

  if (phase === 'placement') {
    return (
      <div className="w-full py-2 px-6 text-center border-b border-dp-border">
        <span
          className="font-orbitron tracking-widest uppercase text-dp-text/50"
          style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem' }}
        >
          PHASE: CORE DEPLOYMENT
        </span>
      </div>
    );
  }

  return null;
}
