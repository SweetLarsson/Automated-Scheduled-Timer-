
import React from 'react';
import { Activity, TimerState } from '../types';

interface Props {
  activity: Activity | null;
  remainingTime: number;
  timerState: TimerState;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onClear: () => void;
  onLaunchProjector: () => void;
}

const CountdownDisplay: React.FC<Props> = ({ 
  activity, 
  remainingTime, 
  timerState, 
  onStart, 
  onPause, 
  onReset, 
  onClear,
  onLaunchProjector
}) => {
  const formatTime = (time: number) => {
    const hrs = Math.floor(time / 3600);
    const mins = Math.floor((time % 3600) / 60);
    const secs = time % 60;
    return hrs > 0
      ? `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      : `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isCritical = remainingTime <= 10 && remainingTime > 0;
  const isFinished = remainingTime === 0 && timerState !== TimerState.IDLE;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className={`flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] border-2 rounded-[2rem] p-8 relative overflow-hidden shadow-inner transition-all duration-500 ${isCritical ? 'border-red-600 shadow-[inset_0_0_100px_rgba(220,38,38,0.2)]' : 'border-[#333]'}`}>
        
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-orange-500 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-orange-500 rounded-full blur-3xl"></div>
        </div>

        <h3 className="text-2xl md:text-3xl font-bold mb-8 text-center text-orange-500 tracking-widest uppercase animate-fade-in drop-shadow-lg break-words w-full px-4">
          {activity ? activity.name : "Ready"}
        </h3>
        
        <div className="relative flex items-center justify-center w-full">
            <h1 className={`bebas-font tracking-[-0.05em] leading-[0.8] select-none transition-all duration-500 drop-shadow-2xl text-center break-all
              ${isFinished ? 'text-red-600 text-5xl md:text-7xl' : 
                isCritical ? 'text-red-50 text-[100px] md:text-[140px] xl:text-[160px] scale-105 animate-pulse' : 
                'text-white text-[90px] md:text-[120px] xl:text-[140px]'
              }`}
            >
              {isFinished ? "TIME'S UP!" : formatTime(remainingTime || 0)}
            </h1>
        </div>

        <div className="absolute top-6 right-8 flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                {timerState}
            </span>
            <div className={`w-4 h-4 rounded-full border border-black shadow-lg ${timerState === TimerState.RUNNING ? 'bg-green-500 animate-pulse' : timerState === TimerState.PAUSED ? 'bg-orange-500' : 'bg-gray-800'}`}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {timerState === TimerState.RUNNING ? (
          <button 
            onClick={onPause}
            className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 border-b-4 border-orange-800 text-sm"
          >
            Pause
          </button>
        ) : (
          <button 
            onClick={onStart}
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 border-b-4 border-green-800 text-sm"
          >
            {timerState === TimerState.PAUSED ? "Resume" : "Start"}
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={onReset}
            className="bg-[#262626] hover:bg-black text-white p-4 rounded-2xl font-black uppercase tracking-[0.15em] transition-all shadow-xl active:scale-95 border-b-4 border-[#111] text-xs"
          >
            Reset
          </button>
          <button 
            onClick={onClear}
            className="bg-[#262626] hover:bg-black text-red-500 p-4 rounded-2xl font-black uppercase tracking-[0.15em] transition-all shadow-xl active:scale-95 border-b-4 border-[#111] text-xs"
          >
            Clear
          </button>
        </div>
        
        <button 
          onClick={onLaunchProjector}
          className="w-full bg-[#1e1e1e] hover:bg-orange-600 text-gray-400 hover:text-white border border-[#333] hover:border-orange-500 p-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all text-xs flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" /></svg>
          Launch Projector
        </button>
      </div>

      <div className="text-[10px] text-center text-gray-500 font-bold uppercase tracking-[0.3em] mt-1 opacity-50">
        Enter: Start/Pause • BKSP: Reset • DEL: Clear
      </div>

      <KeyboardShortcuts onStartPause={() => timerState === TimerState.RUNNING ? onPause() : onStart()} onReset={onReset} onClear={onClear} />
    </div>
  );
};

const KeyboardShortcuts: React.FC<{ onStartPause: () => void, onReset: () => void, onClear: () => void }> = ({ onStartPause, onReset, onClear }) => {
  React.useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter') onStartPause();
      if (e.key === 'Backspace') onReset();
      if (e.key === 'Delete') onClear();
    };
    window.addEventListener('keydown', handleDown);
    return () => window.removeEventListener('keydown', handleDown);
  }, [onStartPause, onReset, onClear]);
  return null;
};

export default CountdownDisplay;
