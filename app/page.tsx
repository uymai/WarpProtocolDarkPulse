'use client';

import { useEffect, useState } from 'react';
import { getOrCreatePlayerId } from '@/lib/uuid';
import LobbyForm from '@/components/LobbyForm';

export default function Home() {
  const [playerId, setPlayerId] = useState('');

  useEffect(() => {
    setPlayerId(getOrCreatePlayerId());
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Title */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="h-px w-16 bg-dp-accent/30" />
          <span
            className="text-dp-accent/50 font-orbitron tracking-widest uppercase"
            style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem' }}
          >
            Neural Grid Warfare System
          </span>
          <div className="h-px w-16 bg-dp-accent/30" />
        </div>

        <h1
          className="font-orbitron font-black uppercase tracking-widest text-dp-accent mb-1"
          style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 'clamp(1.5rem, 5vw, 3rem)',
            textShadow: '0 0 30px rgba(0,240,255,0.5), 0 0 60px rgba(0,240,255,0.2)',
            letterSpacing: '0.12em',
          }}
        >
          Warp Protocol
        </h1>

        <h2
          className="font-orbitron font-bold uppercase tracking-widest text-dp-hit"
          style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 'clamp(0.8rem, 2.5vw, 1.4rem)',
            textShadow: '0 0 20px rgba(255,0,60,0.6)',
            letterSpacing: '0.2em',
          }}
        >
          Dark Pulse
        </h2>

        <p className="text-dp-text/40 mt-4 font-mono text-xs max-w-xs mx-auto leading-relaxed">
          Identify and disable your opponent&apos;s cores before they find yours.
          <br />
          Five systems. One grid. No mercy.
        </p>
      </div>

      {/* Form */}
      {playerId ? (
        <LobbyForm playerId={playerId} />
      ) : (
        <div className="text-dp-text/40 text-xs font-mono animate-pulse">
          SYNCING NEURAL ID...
        </div>
      )}

      {/* Player ID display */}
      {playerId && (
        <div className="mt-10 text-center">
          <div className="text-dp-text/20 text-xs font-mono" style={{ fontSize: '0.55rem' }}>
            OPERATIVE ID:{' '}
            <span className="text-dp-accent/40">{playerId.slice(0, 8).toUpperCase()}...</span>
          </div>
        </div>
      )}
    </main>
  );
}
