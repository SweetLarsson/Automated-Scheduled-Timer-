
import React, { useEffect, useRef, useState } from 'react';
import { Activity, TimerState, Theme } from '../types';
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
  onPrevious: () => void;
  onNext: () => void;
  onAdjustTime: (seconds: number) => void;
  canStart: boolean;
  theme?: Theme;
  isTheaterMode?: boolean;
  isVoiceActive?: boolean;
  onToggleVoice?: () => void;
  onToggleTheaterMode?: () => void;
}

const MicVisualizer: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [bars, setBars] = useState([0.2, 0.2, 0.2, 0.2, 0.2]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      return;
    }

    const startVisualizer = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 32;
        analyserRef.current = analyser;
        
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const update = () => {
          analyser.getByteFrequencyData(dataArray);
          // Pick 5 frequencies and normalize
          const newBars = [
            dataArray[1] / 255,
            dataArray[3] / 255,
            dataArray[5] / 255,
            dataArray[7] / 255,
            dataArray[9] / 255,
          ].map(val => Math.max(0.15, val));
          setBars(newBars);
          animationRef.current = requestAnimationFrame(update);
        };
        
        update();
      } catch (err) {
        console.error("Error starting mic visualizer:", err);
      }
    };

    startVisualizer();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="flex items-end gap-[2px] h-4 ml-2">
      {bars.map((height, i) => (
        <div 
          key={i} 
          className="w-[3px] bg-white rounded-full transition-all duration-75" 
          style={{ height: `${height * 100}%` }}
        />
      ))}
    </div>
  );
};

const CountdownDisplay: React.FC<Props> = ({ 
  activity, 
  nextActivity,
  remainingTime, 
  timerState, 
  onStart, 
  onPause, 
  onReset, 
  onClear,
  onPrevious,
  onNext,
  onAdjustTime,
  canStart,
  theme = 'dark',
  isTheaterMode = false,
  isVoiceActive = false,
  onToggleVoice,
  onToggleTheaterMode
}) => {
  const isDark = theme === 'dark';

  return (
    <div className={`flex flex-col h-full transition-all duration-700 ${isTheaterMode ? 'gap-0' : 'gap-4'}`}>
      <div className={`relative overflow-hidden group transition-all duration-700 
        ${isTheaterMode ? 'flex-1 border-none rounded-none shadow-none' : 'flex-1 min-h-[40%] rounded-[2rem] border-2 shadow-2xl'}
        ${isDark ? 'border-[#333] bg-black' : 'border-gray-200 bg-white'}`}>
        
        <div className="w-full h-full">
          <TimerDisplayVisual 
            name={activity ? activity.name : ""} 
            nextName={nextActivity ? nextActivity.name : ""}
            time={remainingTime} 
            state={timerState} 
            isCompact={!isTheaterMode}
            theme={theme}
          />
        </div>

        <div className={`absolute top-4 right-6 z-30 flex items-center gap-2 transition-opacity ${isTheaterMode ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
            <span className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {timerState}
            </span>
            <div className={`w-3 h-3 rounded-full border border-black/50 shadow-lg ${
                timerState === TimerState.RUNNING || timerState === TimerState.TRANSITION ? 'bg-green-500 animate-pulse' : 
                timerState === TimerState.PAUSED ? 'bg-orange-500' : 'bg-gray-400'}`}></div>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-3 mt-auto transition-all duration-500 ${isTheaterMode ? 'max-h-0 opacity-0 overflow-hidden group-hover:max-h-96 group-hover:opacity-100 group-hover:pb-6 group-hover:px-6' : 'max-h-[1000px] opacity-100'}`}>
        <div className="grid grid-cols-1 gap-3">
          {(timerState === TimerState.RUNNING || timerState === TimerState.TRANSITION) ? (
            <button 
              onClick={onPause}
              className={`p-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 border-b-4 text-sm ${isDark ? 'bg-orange-600 hover:bg-orange-700 text-white border-orange-800' : 'bg-orange-600 hover:bg-orange-700 text-white border-orange-900'}`}
            >
              Pause
            </button>
          ) : (
            <button 
              onClick={onStart}
              disabled={!canStart && !activity}
              className={`p-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 border-b-4 text-sm disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'bg-green-600 hover:bg-green-700 text-white border-green-800' : 'bg-green-600 hover:bg-green-700 text-white border-green-800'}`}
            >
              {timerState === TimerState.PAUSED ? "Resume" : "Start Live"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-3">
          <button 
            onClick={onPrevious}
            disabled={!activity}
            className={`p-4 rounded-2xl font-black uppercase tracking-[0.15em] transition-all shadow-xl active:scale-95 border-b-4 text-[10px] disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'bg-[#262626] hover:bg-black text-white border-[#111]' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-400'}`}
          >
            Prev
          </button>
          <button 
            onClick={onNext}
            disabled={!activity}
            className={`p-4 rounded-2xl font-black uppercase tracking-[0.15em] transition-all shadow-xl active:scale-95 border-b-4 text-[10px] disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'bg-[#262626] hover:bg-black text-white border-[#111]' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-400'}`}
          >
            Next
          </button>
          <button 
            onClick={onReset}
            disabled={!activity}
            className={`p-4 rounded-2xl font-black uppercase tracking-[0.15em] transition-all shadow-xl active:scale-95 border-b-4 text-[10px] disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'bg-[#262626] hover:bg-black text-white border-[#111]' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-400'}`}
          >
            Reset
          </button>
          <button 
            onClick={onClear}
            disabled={!activity}
            className={`p-4 rounded-2xl font-black uppercase tracking-[0.15em] transition-all shadow-xl active:scale-95 border-b-4 text-[10px] disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'bg-[#262626] hover:bg-black text-red-500 border-[#111]' : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'}`}
          >
            Clear
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => onAdjustTime(-60)}
            disabled={!activity}
            className={`p-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 border-b-4 text-sm flex items-center justify-center gap-2 ${isDark ? 'bg-[#262626] hover:bg-black text-white border-[#111]' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-400'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
            1m
          </button>
          <button 
            onClick={() => onAdjustTime(60)}
            disabled={!activity}
            className={`p-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 border-b-4 text-sm flex items-center justify-center gap-2 ${isDark ? 'bg-[#262626] hover:bg-black text-white border-[#111]' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-400'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            1m
          </button>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onToggleVoice}
            className={`flex-1 p-4 px-6 rounded-2xl font-black uppercase transition-all shadow-xl active:scale-95 border-b-4 flex items-center justify-center min-w-[100px] ${isVoiceActive ? 'bg-orange-500 border-orange-700 text-white' : (isDark ? 'bg-[#262626] border-[#111] text-gray-400' : 'bg-white border-gray-300 text-gray-500')}`}
            title="Toggle Conversational Voice Control"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            <MicVisualizer isActive={isVoiceActive} />
          </button>
          <button 
            onClick={onToggleTheaterMode}
            className={`flex-1 p-4 px-6 rounded-2xl font-black uppercase transition-all shadow-xl active:scale-95 border-b-4 flex items-center justify-center min-w-[100px] ${isTheaterMode ? 'bg-orange-500 border-orange-700 text-white' : (isDark ? 'bg-[#262626] border-[#111] text-gray-400' : 'bg-white border-gray-300 text-gray-500')}`}
            title="Toggle Projector Mode"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
        </div>

        {/* Keyboard Shortcuts Visibility */}
        {!isTheaterMode && (
          <div className={`mt-4 p-4 rounded-2xl border transition-all duration-500 max-h-[160px] overflow-y-auto no-scrollbar shrink-0 ${isDark ? 'bg-black/20 border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
            <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-3 sticky top-0 z-10 py-1 ${isDark ? 'bg-[#121212] text-gray-500' : 'bg-white text-gray-400'}`}>Keyboard Shortcuts</h3>
            <div className="grid grid-flow-col grid-rows-4 gap-x-4 gap-y-2 w-full">
              {[
                { label: 'Play/Pause', key: 'Spacebar' },
                { label: 'Previous', key: 'P' },
                { label: 'Clear', key: 'Backspace' },
                { label: 'Decrement', key: 'D' },
                { label: 'Fullscreen', key: 'Key F' },
                { label: 'Next', key: 'N' },
                { label: 'Reset', key: 'Delete' },
                { label: 'Increment', key: 'I' }
              ].map((shortcut, i) => (
                <div key={i} className="flex items-center gap-2 min-w-0 overflow-hidden border-b border-white/5 pb-1 last:border-0">
                  <span className={`text-[7px] font-bold uppercase tracking-tight truncate shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{shortcut.label}</span>
                  <span className={`text-[8px] font-bold ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>-</span>
                  <span className={`text-[8px] font-mono font-black border px-1.5 py-0.5 rounded shrink-0 ${isDark ? 'bg-white/5 border-white/10 text-orange-500' : 'bg-black/5 border-black/10 text-orange-600'}`}>{shortcut.key}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isTheaterMode && (
        <div className={`text-[10px] text-center font-bold uppercase tracking-[0.3em] mt-1 opacity-50 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Event Control System • Professional Synchronization
        </div>
      )}
    </div>
  );
};

export default CountdownDisplay;
