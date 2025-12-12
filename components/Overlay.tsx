import React from 'react';
import { TreeState } from '../types';

interface OverlayProps {
  treeState: TreeState;
  onToggle: () => void;
}

export const Overlay: React.FC<OverlayProps> = ({ treeState, onToggle }) => {
  const isFormed = treeState === TreeState.FORMED;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-8 md:p-12">
      {/* Header */}
      <header className="flex flex-col items-center opacity-0 animate-[fadeIn_1s_ease-out_1s_forwards]">
        <h1 className="metallic-text font-script text-6xl md:text-8xl drop-shadow-2xl">
          Merry Christmas
        </h1>
        <h2 className="text-arix-paleGold/80 font-serif italic text-lg md:text-2xl mt-2 tracking-wide">
          Arix Signature Collection
        </h2>
        <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-arix-gold to-transparent my-6 opacity-60"></div>
      </header>

      {/* Controls */}
      <footer className="flex flex-col items-center mb-8 md:mb-0">
        <button
          onClick={onToggle}
          className={`
            pointer-events-auto
            group relative px-10 py-4 
            overflow-hidden transition-all duration-700 ease-out
            border border-arix-gold/40 hover:border-arix-gold
            bg-[#001005]/60 backdrop-blur-md rounded-sm
          `}
        >
          <div className={`
            absolute inset-0 w-full h-full bg-gradient-to-r from-arix-gold/20 to-transparent
            transform transition-transform duration-700 origin-left
            ${isFormed ? 'scale-x-0 group-hover:scale-x-100' : 'scale-x-100 group-hover:scale-x-0'}
          `}></div>

          <span className="relative z-10 font-display text-sm md:text-lg tracking-[0.3em] text-arix-paleGold uppercase drop-shadow-md">
            {isFormed ? 'Scatter' : 'Assemble'}
          </span>
        </button>

        <p className="mt-6 text-arix-gold/40 text-[10px] font-display tracking-[0.2em] uppercase text-center leading-relaxed">
          Interactive Experience<br/>
          Use Hand Gestures to Control
        </p>
      </footer>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};