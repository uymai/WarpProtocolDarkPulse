'use client';

import { CoreDefinition, CoreType, Orientation, PlacedCore } from '@/types/game';

interface CorePlacerProps {
  coreDefs: CoreDefinition[];
  placedCores: PlacedCore[];
  selectedCore: CoreType | null;
  orientation: Orientation;
  onSelectCore: (id: CoreType) => void;
  onToggleOrientation: () => void;
  onConfirmPlacement: () => void;
}

export default function CorePlacer({
  coreDefs,
  placedCores,
  selectedCore,
  orientation,
  onSelectCore,
  onToggleOrientation,
  onConfirmPlacement,
}: CorePlacerProps) {
  const placedIds = new Set(placedCores.map((c) => c.id));
  const allPlaced = placedIds.size === coreDefs.length;

  return (
    <div className="flex flex-col gap-3 w-56">
      <div
        className="text-dp-accent font-orbitron text-xs tracking-widest uppercase border-b border-dp-border pb-2"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        Deploy Cores
      </div>

      {/* Core list */}
      <div className="flex flex-col gap-2">
        {coreDefs.map((def) => {
          const isPlaced = placedIds.has(def.id);
          const isSelected = selectedCore === def.id;

          return (
            <button
              key={def.id}
              onClick={() => !isPlaced && onSelectCore(def.id)}
              disabled={isPlaced}
              className={`
                text-left p-2 border transition-all duration-150 rounded-sm
                ${isPlaced
                  ? 'border-dp-border opacity-50 cursor-default'
                  : isSelected
                  ? 'border-dp-accent bg-dp-accent/10 glow-cyan'
                  : 'border-dp-border hover:border-dp-accent/60 hover:bg-dp-accent/5'
                }
              `}
              style={isSelected ? { boxShadow: '0 0 8px rgba(0,240,255,0.4)' } : {}}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className={`font-orbitron text-xs tracking-wide ${isSelected ? 'text-dp-accent' : 'text-dp-text'}`}
                  style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem' }}
                >
                  {def.displayName}
                </span>
                {isPlaced ? (
                  <span className="text-green-400 text-xs">✓ SET</span>
                ) : (
                  <span className="text-dp-accent/60 text-xs">[{def.size}]</span>
                )}
              </div>
              <div className="text-dp-text/40 text-xs leading-tight" style={{ fontSize: '0.6rem' }}>
                {def.flavorText}
              </div>
              {/* Size visualizer */}
              <div className="flex gap-0.5 mt-1.5">
                {Array.from({ length: def.size }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 border ${
                      isPlaced
                        ? 'bg-green-900 border-green-700'
                        : isSelected
                        ? 'bg-dp-accent/30 border-dp-accent'
                        : 'bg-dp-grid border-dp-border'
                    }`}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Orientation toggle */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-dp-text/50 text-xs uppercase tracking-wider" style={{ fontSize: '0.6rem' }}>
          Orientation
        </span>
        <button
          onClick={onToggleOrientation}
          className="flex-1 btn-cyber text-xs py-1"
          style={{ fontSize: '0.65rem' }}
        >
          {orientation === 'horizontal' ? '→ HORIZ' : '↓ VERT'}
        </button>
      </div>

      {/* Confirm button */}
      <button
        onClick={onConfirmPlacement}
        disabled={!allPlaced}
        className="btn-cyber mt-2 py-2"
        style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem' }}
      >
        {allPlaced ? 'Deploy Cores' : `Place ${coreDefs.length - placedIds.size} More`}
      </button>

      <div className="text-dp-text/30 text-center leading-tight" style={{ fontSize: '0.55rem' }}>
        Click a core, then click the grid to place it.
        <br />
        Click a placed cell to remove it.
      </div>
    </div>
  );
}
