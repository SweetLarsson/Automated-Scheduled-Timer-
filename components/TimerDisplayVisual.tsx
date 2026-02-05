
import React from 'react';
import { TimerState } from '../types';

interface Props {
  name: string;
  time: number;
  state: TimerState;
  isCompact?: boolean;
}

const TimerDisplayVisual: React.FC<Props> = ({ name, time, state, isCompact = false }) => {
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return hrs > 0
      ? `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      : `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isCritical = time <= 10 && time > 0;
  const isFinished = time === 0 && state !== TimerState.IDLE;

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-[#050505] transition-all duration-500 ${isCompact ? 'rounded-2xl' : ''}`}>
      
      {/* Dynamic Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-1/4 -left-1/4 w-full h-full rounded-full blur-[150px] transition-colors duration-1000 ${isCritical ? 'bg-red-900/40' : 'bg-orange-900/20'}`}></div>
        <div className={`absolute -bottom-1/4 -right-1/4 w-full h-full rounded-full blur-[150px] transition-colors duration-1000 ${isCritical ? 'bg-red-900/40' : 'bg-orange-900/20'}`}></div>
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full px-4">
        <div className={`${isCompact ? 'mb-4' : 'mb-12'} overflow-hidden w-full flex justify-center`}>
          <h2 className={`font-black text-center text-orange-500 tracking-[0.15em] uppercase drop-shadow-[0_0_30px_rgba(249,115,22,0.4)] animate-fade-in break-words max-w-[95%]
            ${isCompact ? 'text-xl md:text-2xl' : 'text-5xl md:text-7xl xl:text-8xl'}
          `}>
            {name}
          </h2>
        </div>

        <div className="relative flex items-center justify-center w-full">
          <h1 className={`bebas-font tracking-tighter leading-none select-none transition-all duration-300 drop-shadow-[0_0_80px_rgba(0,0,0,0.9)] text-center
            ${isFinished ? (isCompact ? 'text-red-600 text-[10vw]' : 'text-red-600 text-[15vw] scale-110') : 
              isCritical ? (isCompact ? 'text-red-50 text-[25vw] animate-pulse' : 'text-red-50 text-[38vw] animate-pulse drop-shadow-[0_0_100px_rgba(220,38,38,0.5)]') : 
              (isCompact ? 'text-white text-[22vw]' : 'text-white text-[35vw]')
            }`}
          >
            {isFinished ? "TIME'S UP!" : formatTime(time)}
          </h1>
        </div>
      </div>

      {/* Status Indicator */}
      {state === TimerState.PAUSED && (
        <div className={`absolute ${isCompact ? 'bottom-4 px-4 py-2 text-sm' : 'bottom-16 px-10 py-4 text-2xl'} flex items-center gap-3 bg-orange-600/10 backdrop-blur-md rounded-full border border-orange-500/30 z-20 animate-pulse`}>
          <div className={`${isCompact ? 'w-2 h-2' : 'w-5 h-5'} rounded-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]`}></div>
          <span className="text-orange-500 font-black tracking-[0.4em] uppercase">Paused</span>
        </div>
      )}

      {/* Cinematic Vignette */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,1)]"></div>
      
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default TimerDisplayVisual;
