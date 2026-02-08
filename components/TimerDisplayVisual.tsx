
import React from 'react';
import { TimerState } from '../types';

interface Props {
  name: string;
  nextName?: string;
  time: number;
  state: TimerState;
  isCompact?: boolean;
}

const TimerDisplayVisual: React.FC<Props> = ({ name, nextName, time, state, isCompact = false }) => {
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return hrs > 0
      ? `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      : `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isCritical = time <= 10 && time > 0 && state === TimerState.RUNNING;
  const isFinished = time === 0 && state !== TimerState.IDLE && state !== TimerState.TRANSITION;
  const isTransition = state === TimerState.TRANSITION;
  const isIdle = state === TimerState.IDLE;

  // If idle, we show 00:00. If finished, we show TIME'S UP. If transition, we show the big number.
  const timeStr = isIdle ? "00:00" : (isFinished ? "TIME'S UP!" : (isTransition ? time.toString() : formatTime(time)));
  
  const getDynamicFontSize = () => {
    const charCount = timeStr.length;
    const hCap = 100;        
    const vCap = isCompact ? 70 : 90; 
    const charWidthFactor = isCompact ? 0.58 : 0.45; 

    const horizontalLimit = hCap / (charCount * charWidthFactor);
    const verticalLimit = vCap;

    return `min(${horizontalLimit}cqw, ${verticalLimit}cqh)`;
  };

  const dynamicFontSize = getDynamicFontSize();

  return (
    <div 
      className={`relative w-full h-full flex flex-col items-center justify-center overflow-hidden transition-all duration-500 
        ${isCompact ? 'rounded-2xl' : ''} 
        ${isTransition ? 'bg-[#000a12]' : 'bg-[#050505]'}
      `}
      style={{ containerType: 'size' } as React.CSSProperties}
    >
      
      {/* Background Ambience - Hidden or dimmed if IDLE */}
      <div className={`absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-1000 ${isIdle ? 'opacity-0' : 'opacity-100'}`}>
        <div className={`absolute -top-1/4 -left-1/4 w-full h-full rounded-full blur-[150px] transition-colors duration-1000 
          ${isTransition ? 'bg-blue-900/40' : isCritical ? 'bg-red-900/40' : 'bg-orange-900/20'}`}></div>
        <div className={`absolute -bottom-1/4 -right-1/4 w-full h-full rounded-full blur-[150px] transition-colors duration-1000 
          ${isTransition ? 'bg-blue-900/40' : isCritical ? 'bg-red-900/40' : 'bg-orange-900/20'}`}></div>
      </div>

      {/* Content Layer */}
      <div className="relative z-10 w-full h-full flex flex-col p-0 text-center box-border items-center justify-center select-none overflow-hidden">
        
        {/* Header: Event Title - HIDDEN IF IDLE */}
        {!isIdle && (
          <div className="absolute top-[3%] left-[2%] right-[2%] h-[12%] flex flex-col items-center justify-center pointer-events-none">
            {isTransition ? (
              <div className="flex flex-col items-center w-full">
                <span className={`text-blue-500 font-black tracking-[0.5em] uppercase mb-1 leading-none ${isCompact ? 'text-[8px]' : 'text-[2.5cqh]'}`}>
                  Get Ready
                </span>
                <h2 className={`font-black text-center text-white tracking-[0.1em] uppercase drop-shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse truncate w-full leading-none
                  ${isCompact ? 'text-[12px]' : 'text-[5.5cqh]'}
                `}>
                  Up Next: {nextName}
                </h2>
              </div>
            ) : (
              <h2 className={`font-black text-center text-orange-500 tracking-[0.15em] uppercase drop-shadow-[0_0_20px_rgba(249,115,22,0.3)] animate-fade-in truncate w-full leading-none
                ${isCompact ? 'text-[14px]' : 'text-[6.5cqh]'}
              `}>
                {name}
              </h2>
            )}
          </div>
        )}

        {/* Center: Hero Countdown */}
        <div className="flex items-center justify-center w-full h-full max-w-full overflow-hidden px-4">
          <h1 
            style={{ fontSize: dynamicFontSize }}
            className={`bebas-font tracking-tighter leading-none select-none transition-all duration-300 drop-shadow-[0_0_80px_rgba(0,0,0,0.95)] text-center w-full whitespace-nowrap flex items-center justify-center
            ${isIdle ? 'text-gray-800' :
              isTransition ? 'text-blue-400' :
              isFinished ? 'text-red-600' : 
              isCritical ? 'text-red-50 animate-pulse drop-shadow-[0_0_120px_rgba(220,38,38,0.6)]' : 
              'text-white'
            }`}
          >
            {timeStr}
          </h1>
        </div>

        {/* Footer: Status Label - HIDDEN IF IDLE */}
        {!isIdle && (
          <div className="absolute bottom-[3%] left-[10%] right-[10%] h-[10%] flex items-center justify-center pointer-events-none">
            {state === TimerState.PAUSED && (
              <div className={`flex items-center gap-2 bg-orange-600/10 backdrop-blur-md rounded-full border border-orange-500/30 px-6 py-2 animate-pulse`}>
                <div className={`${isCompact ? 'w-1.5 h-1.5' : 'w-3 h-3'} rounded-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]`}></div>
                <span className={`text-orange-500 font-black tracking-[0.4em] uppercase ${isCompact ? 'text-[8px]' : 'text-[2.5cqh]'}`}>Paused</span>
              </div>
            )}
          </div>
        )}
      </div>

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
