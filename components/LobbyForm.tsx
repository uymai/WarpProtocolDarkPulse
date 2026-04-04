'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGame, joinGame } from '@/lib/firestore';

interface LobbyFormProps {
  playerId: string;
}

export default function LobbyForm({ playerId }: LobbyFormProps) {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const gameId = await createGame(playerId);
      router.push(`/game/${gameId}`);
    } catch (e) {
      setError('Failed to create game. Check your connection.');
      setCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) return;
    setJoining(true);
    setError(null);
    try {
      await joinGame(code, playerId);
      router.push(`/game/${code}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to join game.';
      setError(msg);
      setJoining(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-sm">
      {/* Create */}
      <div className="flex flex-col gap-3">
        <div
          className="text-dp-text/50 font-orbitron tracking-widest uppercase text-xs border-b border-dp-border pb-2"
          style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem' }}
        >
          New Protocol
        </div>
        <button
          onClick={handleCreate}
          disabled={creating || !playerId}
          className="btn-cyber py-3 text-sm"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          {creating ? 'INITIALIZING...' : 'Initialize New Protocol'}
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 text-dp-border text-xs">
        <div className="flex-1 border-t border-dp-border" />
        <span style={{ fontSize: '0.6rem' }}>OR</span>
        <div className="flex-1 border-t border-dp-border" />
      </div>

      {/* Join */}
      <div className="flex flex-col gap-3">
        <div
          className="text-dp-text/50 font-orbitron tracking-widest uppercase text-xs border-b border-dp-border pb-2"
          style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem' }}
        >
          Link to Protocol
        </div>
        <form onSubmit={handleJoin} className="flex flex-col gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="ENTER PROTOCOL CODE"
            className="bg-dp-surface border border-dp-border text-dp-text placeholder:text-dp-text/20 px-3 py-2 font-mono text-sm focus:outline-none focus:border-dp-accent transition-colors"
            style={{ letterSpacing: '0.05em' }}
          />
          <button
            type="submit"
            disabled={joining || !joinCode.trim() || !playerId}
            className="btn-cyber py-3 text-sm"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {joining ? 'LINKING...' : 'Link to Protocol'}
          </button>
        </form>
      </div>

      {error && (
        <div className="border border-dp-hit/50 bg-dp-hit/10 text-dp-hit px-3 py-2 text-xs font-mono">
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
