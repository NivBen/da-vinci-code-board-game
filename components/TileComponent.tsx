import React from 'react';
import { Tile, TileColor } from '../types';
import { JOKER_VALUE } from '../constants';

interface TileComponentProps {
  tile: Tile;
  isHidden?: boolean; // If true, show back of tile (unless revealed)
  isInteractable?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  isNew?: boolean; // Highlight for newly drawn
  
  // Drag and Drop
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

const TileComponent: React.FC<TileComponentProps> = ({
  tile,
  isHidden = false,
  isInteractable = false,
  onClick,
  isSelected = false,
  isNew = false,
  draggable = false,
  onDragStart,
  onDrop,
}) => {
  // Determine if we show the number or the back
  const showFace = tile.isRevealed || !isHidden;
  const isJoker = tile.isJoker || tile.value === JOKER_VALUE;

  const baseClasses = `
    relative flex items-center justify-center w-10 h-14 md:w-14 md:h-20 rounded shadow-md border-2 transition-all duration-300 transform select-none
    ${isInteractable ? 'cursor-pointer hover:-translate-y-2 hover:shadow-xl' : ''}
    ${draggable ? 'cursor-grab active:cursor-grabbing hover:scale-105' : ''}
    ${!isInteractable && !draggable ? 'cursor-default' : ''}
    ${isSelected ? 'ring-4 ring-yellow-400 -translate-y-2 scale-105 z-10' : ''}
    ${isNew ? 'ring-2 ring-blue-400' : ''}
  `;

  const colorClasses =
    tile.color === TileColor.BLACK
      ? 'bg-slate-800 border-slate-600 text-white'
      : 'bg-slate-100 border-slate-300 text-slate-900';

  const handleDragOver = (e: React.DragEvent) => {
    if (onDrop) {
      e.preventDefault(); // Allow drop
    }
  };

  return (
    <div
      onClick={isInteractable ? onClick : undefined}
      className={`${baseClasses} ${colorClasses}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDrop={onDrop}
      onDragOver={handleDragOver}
    >
      {showFace ? (
        <span className="text-2xl md:text-4xl font-bold font-mono">
          {isJoker ? '—' : tile.value}
          {!isJoker && (tile.value === 6 || tile.value === 9) ? <span className="absolute bottom-1 right-1 text-[8px] md:text-[10px] opacity-50">_</span> : null}
        </span>
      ) : (
        <div className="w-full h-full flex items-center justify-center opacity-20">
          {/* Pattern for back of tile */}
          <div className="w-6 h-6 rounded-full border-2 border-current"></div>
        </div>
      )}
      
      {/* Indicator for revealed tiles (if they are face up because they were revealed by error) */}
      {tile.isRevealed && isHidden && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1 rounded-full shadow">
          REV
        </div>
      )}

      {/* Indicator for newly drawn tile */}
      {isNew && !tile.isRevealed && (
         <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] px-1 rounded-full shadow">
         NEW
       </div>
      )}

      {/* Indicator for Own Joker that can be moved (only if visible to owner and not revealed) */}
      {isJoker && !isHidden && !tile.isRevealed && draggable && (
        <div className="absolute -top-2 -left-2 bg-yellow-400 text-black text-[10px] px-1 rounded-full shadow font-bold animate-pulse">
          DRAG
        </div>
      )}
    </div>
  );
};

export default TileComponent;