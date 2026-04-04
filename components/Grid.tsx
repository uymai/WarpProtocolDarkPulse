'use client';

import { CellState } from '@/types/game';

interface GridProps {
  cells: CellState[];
  mode: 'placement' | 'attack' | 'view';
  onCellClick?: (index: number) => void;
  onCellHover?: (index: number | null) => void;
  pendingCells?: number[];
  pendingValid?: boolean;
  label: string;
  disabled?: boolean;
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const ROW_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export default function Grid({
  cells,
  mode,
  onCellClick,
  onCellHover,
  pendingCells = [],
  pendingValid = true,
  label,
  disabled = false,
}: GridProps) {
  const pendingSet = new Set(pendingCells);

  function getCellClasses(cell: CellState): string {
    const base = 'grid-cell w-full h-full';

    if (pendingSet.has(cell.index)) {
      return `${base} ${pendingValid ? 'cell-preview-valid' : 'cell-preview-invalid'}`;
    }
    if (cell.isHit && cell.isDisabled) return `${base} cell-disabled`;
    if (cell.isHit) return `${base} cell-hit`;
    if (cell.isMiss) return `${base} cell-miss`;
    if (cell.hasCore) return `${base} cell-core`;
    return base;
  }

  function getCellSymbol(cell: CellState): string {
    if (pendingSet.has(cell.index)) return '';
    if (cell.isHit && cell.isDisabled) return '⊗';
    if (cell.isHit) return '✕';
    if (cell.isMiss) return '·';
    return '';
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="text-dp-accent font-orbitron text-xs tracking-widest uppercase mb-2 text-center"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        {label}
      </div>

      <div
        className="rounded border border-dp-border"
        style={{ boxShadow: '0 0 30px rgba(0,240,255,0.12)' }}
      >
        {/* Column headers */}
        <div className="grid" style={{ gridTemplateColumns: `1.5rem repeat(10, 1fr)` }}>
          <div className="w-6 h-6" />
          {COL_LABELS.map((c) => (
            <div
              key={c}
              className="h-6 flex items-center justify-center text-dp-accent/50 text-xs font-orbitron"
              style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem' }}
            >
              {c}
            </div>
          ))}
        </div>

        {/* Rows */}
        {ROW_LABELS.map((rowLabel, rowIdx) => (
          <div
            key={rowLabel}
            className="grid"
            style={{ gridTemplateColumns: `1.5rem repeat(10, 1fr)` }}
          >
            {/* Row header */}
            <div
              className="w-6 flex items-center justify-center text-dp-accent/50 text-xs font-orbitron"
              style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem' }}
            >
              {rowLabel}
            </div>

            {/* Cells */}
            {cells.slice(rowIdx * 10, rowIdx * 10 + 10).map((cell) => {
              const isInteractive = mode === 'attack' || mode === 'placement';
              const isAlreadyShot = cell.isHit || cell.isMiss;

              if (isInteractive && !disabled && !(mode === 'attack' && isAlreadyShot)) {
                return (
                  <button
                    key={cell.index}
                    className={`${getCellClasses(cell)} ${mode === 'attack' ? 'grid-cell-attack' : ''}`}
                    style={{ width: '2.2rem', height: '2.2rem' }}
                    onClick={() => onCellClick?.(cell.index)}
                    onMouseEnter={() => onCellHover?.(cell.index)}
                    onMouseLeave={() => onCellHover?.(null)}
                    disabled={disabled || (mode === 'attack' && isAlreadyShot)}
                    aria-label={`Cell ${COL_LABELS[cell.index % 10]}${ROW_LABELS[Math.floor(cell.index / 10)]}`}
                  >
                    {getCellSymbol(cell)}
                  </button>
                );
              }

              return (
                <div
                  key={cell.index}
                  className={getCellClasses(cell)}
                  style={{ width: '2.2rem', height: '2.2rem' }}
                >
                  {getCellSymbol(cell)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
