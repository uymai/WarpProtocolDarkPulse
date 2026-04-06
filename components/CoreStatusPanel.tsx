'use client';

import { PlacedCore, Shot } from '@/types/game';
import { CORE_DEFINITIONS, isCoreDisabled } from '@/lib/gameLogic';

interface CoreStatusPanelProps {
  label: string;
  shots: Shot[];
  /**
   * Pass cores when displaying the current player's own board (positions known).
   * Omit for the enemy board — status is derived from shot hit-count alone so
   * that core positions are never leaked to the opponent's client.
   */
  cores?: PlacedCore[];
}

export default function CoreStatusPanel({ label, shots, cores }: CoreStatusPanelProps) {
  return (
    <div className="flex flex-col gap-2 w-44">
      <div
        className="text-dp-accent/70 font-orbitron text-xs tracking-widest uppercase border-b border-dp-border pb-1.5"
        style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem' }}
      >
        {label}
      </div>

      {CORE_DEFINITIONS.map((def) => {
        if (cores) {
          // Own board: use real core positions
          const core = cores.find((c) => c.id === def.id);
          if (!core) return null;

          const disabled = isCoreDisabled(core, shots);
          const hitCount = core.cells.filter((cell) =>
            shots.some((s) => s.hit && s.index === cell)
          ).length;

          return (
            <div
              key={def.id}
              className={`p-1.5 border rounded-sm transition-all ${
                disabled
                  ? 'border-dp-disabled/50 bg-dp-disabled/10'
                  : 'border-dp-border bg-dp-surface'
              }`}
              style={disabled ? { boxShadow: '0 0 6px rgba(255,106,0,0.2)' } : {}}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`font-orbitron tracking-wide ${disabled ? 'text-dp-disabled line-through' : 'text-dp-text'}`}
                  style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem' }}
                >
                  {def.displayName}
                </span>
                <span
                  className={`text-xs font-orbitron tracking-widest ${disabled ? 'text-dp-disabled' : 'text-green-400'}`}
                  style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.55rem' }}
                >
                  {disabled ? 'OFFLINE' : 'ONLINE'}
                </span>
              </div>
              <div className="flex gap-0.5">
                {core.cells.map((cell, i) => {
                  const isHit = shots.some((s) => s.hit && s.index === cell);
                  return (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 ${
                        isHit ? (disabled ? 'bg-dp-disabled' : 'bg-dp-hit') : 'bg-dp-border'
                      }`}
                    />
                  );
                })}
              </div>
              {hitCount > 0 && !disabled && (
                <div className="text-dp-hit/70 mt-0.5" style={{ fontSize: '0.5rem' }}>
                  {hitCount}/{def.size} cells breached
                </div>
              )}
            </div>
          );
        } else {
          // Enemy board: derive status purely from shot coreHit counts —
          // no opponent board positions are needed or exposed
          const hitCount = shots.filter((s) => s.hit && s.coreHit === def.id).length;
          const disabled = hitCount >= def.size;

          return (
            <div
              key={def.id}
              className={`p-1.5 border rounded-sm transition-all ${
                disabled
                  ? 'border-dp-disabled/50 bg-dp-disabled/10'
                  : 'border-dp-border bg-dp-surface'
              }`}
              style={disabled ? { boxShadow: '0 0 6px rgba(255,106,0,0.2)' } : {}}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`font-orbitron tracking-wide ${disabled ? 'text-dp-disabled line-through' : 'text-dp-text'}`}
                  style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem' }}
                >
                  {def.displayName}
                </span>
                <span
                  className={`text-xs font-orbitron tracking-widest ${disabled ? 'text-dp-disabled' : 'text-green-400'}`}
                  style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.55rem' }}
                >
                  {disabled ? 'OFFLINE' : 'ONLINE'}
                </span>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: def.size }, (_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 ${
                      i < hitCount ? (disabled ? 'bg-dp-disabled' : 'bg-dp-hit') : 'bg-dp-border'
                    }`}
                  />
                ))}
              </div>
              {hitCount > 0 && !disabled && (
                <div className="text-dp-hit/70 mt-0.5" style={{ fontSize: '0.5rem' }}>
                  {hitCount}/{def.size} cells breached
                </div>
              )}
            </div>
          );
        }
      })}
    </div>
  );
}
