'use client';

import { useEffect, useState } from 'react';
import { CoreType } from '@/types/game';
import { CORE_DEFINITIONS } from '@/lib/gameLogic';

interface ShotResultProps {
  hit: boolean;
  coreHit: CoreType | null;
  coreDisabled: boolean;
  triggerKey: number; // increment to re-trigger
}

export default function ShotResult({ hit, coreHit, coreDisabled, triggerKey }: ShotResultProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (triggerKey === 0) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(t);
  }, [triggerKey]);

  if (!visible) return null;

  const coreName = coreHit
    ? CORE_DEFINITIONS.find((d) => d.id === coreHit)?.displayName ?? coreHit
    : null;

  let message: string;
  let colorClass: string;
  let shadowColor: string;

  if (coreDisabled && coreName) {
    message = `CORE DISABLED — ${coreName.toUpperCase()} OFFLINE`;
    colorClass = 'text-dp-disabled border-dp-disabled bg-dp-disabled/10';
    shadowColor = '0 0 30px rgba(255,106,0,0.4)';
  } else if (hit && coreName) {
    message = `DIRECT HIT — ${coreName.toUpperCase()} COMPROMISED`;
    colorClass = 'text-dp-hit border-dp-hit bg-dp-hit/10';
    shadowColor = '0 0 30px rgba(255,0,60,0.4)';
  } else {
    message = 'SIGNAL LOST — MISSED';
    colorClass = 'text-dp-miss border-dp-border bg-dp-miss/30';
    shadowColor = 'none';
  }

  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 border font-orbitron tracking-widest uppercase text-sm animate-flicker ${colorClass}`}
      style={{
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '0.75rem',
        boxShadow: shadowColor,
        letterSpacing: '0.15em',
      }}
    >
      {message}
    </div>
  );
}
