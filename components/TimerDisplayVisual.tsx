
import React from 'react';
import { TimerState, Theme } from '../types';

interface Props {
  name: string;
  nextName?: string;
  time: number;
  state: TimerState;
  isCompact?: boolean;
  theme?: Theme;
}

const TimerDisplayVisual: React.FC<Props> = ({ name, nextName, time, state, isCompact = false, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  
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

  const timeStr = isIdle ? "00:00" : (isFinished ? "00:00" : (isTransition ? time.toString() : formatTime(time)));
  
  // Dynamic font size for the main countdown timer - Increased to cover more screen
  const getTimerFontSize = () => {
    const charCount = timeStr.length;
    const hCap = 92; // Widened horizontal cap
    const vCap = isCompact ? 70 : 85; // Significantly increased vertical cap to fill screen
    const charWidthFactor = isCompact ? 0.6 : 0.5; 
    const horizontalLimit = hCap / (charCount * charWidthFactor);
    return `min(${horizontalLimit}cqw, ${vCap}cqh)`;
  };

  // Dynamic font size for the event title (name) - Shrinks to fit
  const getTitleFontSize = (text: string) => {
    if (!text) return '0px';
    const charCount = text.length;
    // hCap: Strictly limited to ensure it fits within visible bounds
    const hCap = 85; 
    const vCap = isCompact ? 6 : 8; 
    // High charWidthFactor ensures aggressive shrinking for longer titles
    const charWidthFactor = 1.0; 
    const horizontalLimit = hCap / (charCount * charWidthFactor);
    return `min(${horizontalLimit}cqw, ${vCap}cqh)`;
  };

  // Dynamic font size for the footer text (nextName)
  const getFooterFontSize = (text: string) => {
    if (!text) return '0px';
    const charCount = text.length;
    const hCap = 75; 
    const vCap = isCompact ? 4 : 5;
    const charWidthFactor = 0.85;
    const horizontalLimit = hCap / (charCount * charWidthFactor);
    return `min(${horizontalLimit}cqw, ${vCap}cqh)`;
  };

  const dynamicTimerSize = getTimerFontSize();
  const dynamicTitleSize = getTitleFontSize(name);
  const dynamicNextSize = getFooterFontSize(`UP NEXT: ${nextName}`);

  // Determine Background Colors
  let bgColorClass = isDark ? (isTransition ? 'bg-[#000a12]' : 'bg-[#050505]') : (isTransition ? 'bg-blue-50' : 'bg-white');
  
  if (isCritical) {
    if (isDark) {
      bgColorClass = 'bg-red-950 animate-pulse-critical';
    } else {
      bgColorClass = 'bg-white animate-pulse-critical-light';
    }
  }

  // Determine Font Colors for the main timer
  let timerColorClass = '';
  if (isIdle) {
    timerColorClass = isDark ? 'text-gray-800' : 'text-gray-200';
  } else if (isTransition) {
    timerColorClass = isDark ? 'text-blue-400' : 'text-blue-600';
  } else if (isFinished) {
    timerColorClass = 'text-red-600';
  } else if (isCritical) {
    timerColorClass = isDark ? 'text-white' : 'text-[#800000]';
  } else {
    timerColorClass = isDark ? 'text-white drop-shadow-[0_0_80px_rgba(0,0,0,0.95)]' : 'text-gray-900';
  }

  return (
    <div 
      className={`relative w-full h-full flex flex-col items-center justify-center overflow-hidden transition-all duration-300 
        ${isCompact ? 'rounded-2xl' : ''} 
        ${bgColorClass}
      `}
      style={{ containerType: 'size' } as React.CSSProperties}
    >
      
      {/* Background Ambience */}
      {!isCritical && (
        <div className={`absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-1000 ${isIdle ? 'opacity-0' : 'opacity-100'}`}>
          <div className={`absolute -top-1/4 -left-1/4 w-full h-full rounded-full blur-[150px] transition-all duration-1000 
            ${isDark 
              ? (isTransition ? 'bg-blue-900/40' : 'bg-orange-900/20') 
              : (isTransition ? 'bg-blue-200/50' : 'bg-orange-100/50')}`}></div>
          <div className={`absolute -bottom-1/4 -right-1/4 w-full h-full rounded-full blur-[150px] transition-all duration-1000 
            ${isDark 
              ? (isTransition ? 'bg-blue-900/40' : 'bg-orange-900/20') 
              : (isTransition ? 'bg-blue-200/50' : 'bg-orange-100/50')}`}></div>
        </div>
      )}

      {/* Content Layer */}
      <div className="relative z-10 w-full h-full flex flex-col p-0 text-center box-border items-center justify-center select-none overflow-hidden">
        
        {/* Header Area (Above Timer) */}
        {!isIdle && (
          <div className="absolute top-[8%] left-0 right-0 h-[10%] flex flex-col items-center justify-center pointer-events-none px-[5%] overflow-hidden">
            {isTransition ? (
              <span className={`font-black tracking-[0.5em] uppercase animate-fade-in leading-none ${isCompact ? 'text-[10px]' : 'text-[3.5cqh]'} ${isDark ? 'text-orange-500' : 'text-orange-600'}`}>
                Get Ready
              </span>
            ) : (
              <div className="flex items-center justify-center w-full max-w-full overflow-hidden">
                <h2 
                  style={{ fontSize: dynamicTitleSize }}
                  className={`font-black text-center tracking-[0.12em] uppercase animate-fade-in whitespace-nowrap leading-none px-4
                    ${isDark ? 'text-orange-500' : 'text-orange-600'}
                  `}>
                  {name}
                </h2>
              </div>
            )}
          </div>
        )}

        {/* Center Area: Hero Countdown */}
        <div className={`flex items-center justify-center w-full h-full max-w-full overflow-hidden ${isCompact ? 'px-4' : 'px-0'}`}>
          <h1 
            style={{ fontSize: dynamicTimerSize }}
            className={`bebas-font tracking-tighter leading-none select-none transition-all duration-150 text-center w-full whitespace-nowrap flex items-center justify-center ${timerColorClass}`}
          >
            {timeStr}
          </h1>
        </div>

        {/* Footer Area (Below Timer) */}
        {!isIdle && (
          <div className="absolute bottom-[8%] left-0 right-0 h-[8%] flex items-center justify-center pointer-events-none px-[8%] overflow-hidden">
            {isTransition ? (
              <h2 
                style={{ fontSize: dynamicNextSize }}
                className={`font-black text-center tracking-[0.08em] uppercase drop-shadow-md animate-pulse whitespace-nowrap w-full leading-none
                ${isDark ? 'text-white' : 'text-gray-900'}
              `}>
                Up Next: {nextName}
              </h2>
            ) : state === TimerState.PAUSED ? (
              <div className={`flex items-center gap-2 backdrop-blur-md rounded-full border px-6 py-2 animate-pulse ${isDark ? 'bg-orange-600/10 border-orange-500/30' : 'bg-orange-100 border-orange-300'}`}>
                <div className={`${isCompact ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full bg-orange-500 shadow-lg`}></div>
                <span className={`font-black tracking-[0.4em] uppercase ${isCompact ? 'text-[8px]' : 'text-[2.2cqh]'} ${isDark ? 'text-orange-500' : 'text-orange-600'}`}>Paused</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {isDark && !isCritical && <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,1)]"></div>}
      
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseCritical {
          0%, 100% { opacity: 1; background-color: rgb(69, 10, 10); }
          50% { opacity: 0.8; background-color: rgb(127, 29, 29); }
        }
        @keyframes pulseCriticalLight {
          0%, 100% { background-color: #ffffff; }
          50% { background-color: #fcebeb; }
        }
        .animate-pulse-critical {
          animation: pulseCritical 0.5s ease-in-out infinite;
        }
        .animate-pulse-critical-light {
          animation: pulseCriticalLight 0.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default TimerDisplayVisual;
