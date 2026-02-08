
import React from 'react';
import { Activity, TimerState } from '../types';
import TimerDisplayVisual from './TimerDisplayVisual';

interface Props {
  activity: Activity | null;
  nextActivity?: Activity | null;
  remainingTime: number;
  timerState: TimerState;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onClear: () => void;
  onLaunchProjector: () => void;
  canStart: boolean;
}

const CountdownDisplay: React.FC<Props> = ({ 
  activity, 
  nextActivity,
  remainingTime, 
  timerState, 
  onStart, 
  onPause, 
  onReset, 
  onClear,
  onLaunchProjector,
  canStart
}) => {
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Mirror Preview Container (LIVE) */}
      <div className="flex-1 relative rounded-[2rem] overflow-hidden border-2 border-[#333] shadow-2xl group min-h-[40%]">
        <TimerDisplayVisual 
          name={activity ? activity.name : ""} 
          nextName={nextActivity ? nextActivity.name : ""}
          time={remainingTime} 
          state={timerState} 
          isCompact={true}
        />
        
        {/* Mirror Label */}
        <div className="absolute top-4 left-6 z-30 flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Live Mirror</span>
        </div>

        {/* Status indicator overlay */}
        <div className="absolute top-4 right-6 z-30 flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500/50">
                {timerState}
            </span>
            <div className={`w-3 h-3 rounded-full border border-black/50 shadow-lg ${
                timerState === TimerState.RUNNING || timerState === TimerState.TRANSITION ? 'bg-green-500 animate-pulse' : 
                timerState === TimerState.PAUSED ? 'bg-orange-500' : 'bg-gray-800'}`}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 mt-auto">
        {(timerState === TimerState.RUNNING || timerState === TimerState.TRANSITION) ? (
          <button 
            onClick={onPause}
            className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 border-b-4 border-orange-800 text-sm"
          >
            Pause
          </button>
        ) : (
          <button 
            onClick={onStart}
            disabled={!canStart && !activity}
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 border-b-4 border-green-800 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {timerState === TimerState.PAUSED ? "Resume" : "Start Live"}
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={onReset}
            disabled={!activity}
            className="bg-[#262626] hover:bg-black text-white p-4 rounded-2xl font-black uppercase tracking-[0.15em] transition-all shadow-xl active:scale-95 border-b-4 border-[#111] text-xs disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Reset
          </button>
          <button 
            onClick={onClear}
            disabled={!activity}
            className="bg-[#262626] hover:bg-black text-red-500 p-4 rounded-2xl font-black uppercase tracking-[0.15em] transition-all shadow-xl active:scale-95 border-b-4 border-[#111] text-xs disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Clear Live
          </button>
        </div>
        
        <button 
          onClick={onLaunchProjector}
          className="w-full bg-[#1e1e1e] hover:bg-orange-600 text-gray-400 hover:text-white border border-[#333] hover:border-orange-500 p-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all text-xs flex items-center justify-center gap-3 shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" /></svg>
          Launch Projector View
        </button>
      </div>

      <div className="text-[10px] text-center text-gray-500 font-bold uppercase tracking-[0.3em] mt-1 opacity-50">
        Enter: Start/Pause • BKSP: Reset • DEL: Clear
      </div>

      <KeyboardShortcuts onStartPause={() => (timerState === TimerState.RUNNING || timerState === TimerState.TRANSITION) ? onPause() : onStart()} onReset={onReset} onClear={onClear} />
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
