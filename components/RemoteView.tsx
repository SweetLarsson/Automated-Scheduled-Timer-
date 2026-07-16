import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Activity, TimerState, ControlAction, Theme } from '../types';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Trash2, Plus, Minus, GripVertical, X, Settings, QrCode, ChevronUp, ChevronDown, Maximize, Clock, List } from 'lucide-react';

const ActivityItem = React.memo(({ 
  activity, 
  index, 
  currentIndex, 
  stagedIndex, 
  isDark, 
  onMove, 
  onUpdateTitle, 
  onUpdateDuration, 
  onDelete, 
  onSelect, 
  onGoLive,
  formatTime
}: { 
  activity: Activity; 
  index: number; 
  currentIndex: number | null; 
  stagedIndex: number | null; 
  isDark: boolean; 
  onMove: (index: number, direction: 'up' | 'down') => void;
  onUpdateTitle: (id: string, name: string) => void;
  onUpdateDuration: (id: string, duration: number) => void;
  onDelete: (id: string) => void;
  onSelect: (index: number) => void;
  onGoLive: (index: number) => void;
  formatTime: (s: number) => string;
}) => (
  <div 
    className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${index === currentIndex ? (isDark ? 'bg-orange-600/10 border-orange-500/50' : 'bg-orange-50 border-orange-200') : (isDark ? 'bg-[#121212] border-[#222]' : 'bg-white border-gray-200')}`}
  >
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-1">
        <button 
          onClick={() => onMove(index, 'up')}
          disabled={index === 0}
          className={`p-1 rounded transition-colors ${index === 0 ? 'opacity-10 cursor-not-allowed' : (isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-500')}`}
        >
          <ChevronUp size={14} />
        </button>
        <button 
          onClick={() => onMove(index, 'down')}
          disabled={index === stagedIndex} // This is a bit arbitrary, but matches original logic
          className={`p-1 rounded transition-colors ${index === stagedIndex ? 'opacity-10 cursor-not-allowed' : (isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-500')}`}
        >
          <ChevronDown size={14} />
        </button>
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <input 
          type="text"
          value={activity.name}
          onChange={(e) => onUpdateTitle(activity.id, e.target.value)}
          className={`bg-transparent font-bold text-sm uppercase tracking-tight outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
        />
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Duration:</span>
          <input 
            type="number"
            value={activity.durationSeconds}
            onChange={(e) => onUpdateDuration(activity.id, parseInt(e.target.value) || 0)}
            className={`w-16 bg-transparent font-mono text-[10px] outline-none ${isDark ? 'text-orange-500' : 'text-orange-600'}`}
          />
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>s</span>
          <span className={`text-[10px] font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>({formatTime(activity.durationSeconds)})</span>
        </div>
      </div>
      <button 
        onClick={() => onDelete(activity.id)}
        className="p-2 rounded-xl text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all"
      >
        <Trash2 size={16} />
      </button>
    </div>
    
    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
      <button 
        onClick={() => onSelect(index)}
        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
          index === currentIndex 
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
            : isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-500 hover:bg-black/5'
        }`}
      >
        Stage
      </button>
      <button 
        onClick={() => onGoLive(index)}
        disabled={index !== stagedIndex}
        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
          index === currentIndex 
            ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' 
            : index === stagedIndex
              ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
              : isDark ? 'bg-orange-600/10 text-orange-500/30 cursor-not-allowed' : 'bg-orange-50 text-orange-600/30 cursor-not-allowed'
        }`}
      >
        {index === currentIndex ? 'Live' : 'Go Live'}
      </button>
    </div>
  </div>
));

const RemoteView: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [stagedIndex, setStagedIndex] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [timerState, setTimerState] = useState<TimerState>(TimerState.IDLE);
  const [theme, setTheme] = useState<Theme>('dark');
  const wakeLockRef = useRef<any>(null);
  const lastTapRef = useRef<number>(0);
  const endTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [eventName, setEventName] = useState('');
  const [hh, setHh] = useState(0);
  const [mm, setMm] = useState(0);
  const [ss, setSs] = useState(0);

  const isDark = theme === 'dark';

  const getSessionId = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('session');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleGoLive = useCallback((index: number) => {
    if (index !== stagedIndex) return;
    sendCommand('GO_LIVE', index);
  }, [stagedIndex, socket]);

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && (navigator as any).wakeLock) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.error("Wake Lock error:", err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.error("Wake Lock release error:", err);
      }
    }
  }, []);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    const sessionId = getSessionId();
    if (sessionId) {
      newSocket.emit('join-room', sessionId);
    }

    newSocket.on('state-updated', (state) => {
      if (state.activities) setActivities(state.activities);
      if (state.currentIndex !== undefined) setCurrentIndex(state.currentIndex);
      if (state.stagedIndex !== undefined) setStagedIndex(state.stagedIndex);
      if (state.timerState) setTimerState(state.timerState);
      if (state.theme) setTheme(state.theme);
      
      // Update local timer state
      if (state.endTime) {
        endTimeRef.current = state.endTime;
      } else if (state.remainingTime !== undefined) {
        setRemainingTime(state.remainingTime);
        endTimeRef.current = null;
      }
    });

    // Initial wake lock
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      newSocket.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  useEffect(() => {
    if (timerState === TimerState.RUNNING || timerState === TimerState.TRANSITION) {
      timerRef.current = setInterval(() => {
        if (endTimeRef.current) {
          const now = Date.now();
          const timeLeft = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
          setRemainingTime(timeLeft);
        }
      }, 200);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerState]);

  const sendCommand = useCallback((type: string, payload?: any) => {
    const sessionId = getSessionId();
    socket?.emit('command', { 
      roomId: sessionId,
      command: { type, payload } 
    });
    // Ensure wake lock is active when taking action
    requestWakeLock();
  }, [socket, requestWakeLock]);

  const handleUpdateTitle = useCallback((id: string, name: string) => {
    const newActivities = activities.map(a => a.id === id ? { ...a, name } : a);
    setActivities(newActivities);
    const sessionId = getSessionId();
    socket?.emit('sync-state', { roomId: sessionId, state: { activities: newActivities } });
  }, [activities, socket]);

  const handleUpdateDuration = useCallback((id: string, durationSeconds: number) => {
    const newActivities = activities.map(a => a.id === id ? { ...a, durationSeconds } : a);
    setActivities(newActivities);
    const sessionId = getSessionId();
    socket?.emit('sync-state', { roomId: sessionId, state: { activities: newActivities } });
  }, [activities, socket]);

  const handleAddActivity = useCallback(() => {
    const total = (hh * 3600) + (mm * 60) + ss;
    if (total <= 0 || !eventName.trim()) return;

    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      name: eventName,
      durationSeconds: total
    };
    const newActivities = [...activities, newActivity];
    setActivities(newActivities);
    const sessionId = getSessionId();
    socket?.emit('sync-state', { roomId: sessionId, state: { activities: newActivities } });
    
    // Reset inputs
    setEventName('');
    setHh(0);
    setMm(0);
    setSs(0);
  }, [hh, mm, ss, eventName, activities, socket]);

  const handleDeleteActivity = useCallback((id: string) => {
    const newActivities = activities.filter(a => a.id !== id);
    setActivities(newActivities);
    const sessionId = getSessionId();
    socket?.emit('sync-state', { roomId: sessionId, state: { activities: newActivities } });
  }, [activities, socket]);

  const handleMoveActivity = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= activities.length) return;
    
    const newActivities = [...activities];
    const [moved] = newActivities.splice(index, 1);
    newActivities.splice(newIndex, 0, moved);
    setActivities(newActivities);
    const sessionId = getSessionId();
    socket?.emit('sync-state', { roomId: sessionId, state: { activities: newActivities } });
  }, [activities, socket]);

  const formatTime = useCallback((totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  return (
    <div className={`h-screen flex flex-col ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-gray-50 text-gray-900'} font-sans overflow-hidden`}>
      {/* Header */}
      <header className="flex justify-between items-center p-4 shrink-0 border-b border-white/5">
        <div className="flex flex-col">
          <h1 className="text-xl font-black uppercase tracking-tighter text-orange-500">Dynamic Timer Remote</h1>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Real-time Synchronization</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleFullscreen}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400' : 'bg-gray-100 hover:bg-black/5 text-gray-500'}`}
            title="Toggle Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>
          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${timerState === TimerState.RUNNING ? 'bg-green-500/10 border-green-500/50 text-green-500 animate-pulse' : 'bg-gray-500/10 border-gray-500/50 text-gray-500'}`}>
            {timerState}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden max-w-lg mx-auto w-full">
        {/* One-line Preview Screen */}
        <div className="bg-black text-green-500 p-3 font-mono text-xs border-b border-green-900/30 flex items-center justify-between overflow-hidden whitespace-nowrap">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-green-800 uppercase font-bold">Live:</span>
              <span className="truncate max-w-[100px]">
                {currentIndex !== null ? activities[currentIndex]?.name : 'None'}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-green-800 uppercase font-bold">Time:</span>
              <span className={timerState === TimerState.RUNNING ? 'animate-pulse' : ''}>
                {formatTime(remainingTime)}
              </span>
            </div>
            <div className="flex items-center gap-1 overflow-hidden">
              <span className="text-[10px] text-green-800 uppercase font-bold shrink-0">Next:</span>
              <span className="truncate text-green-600 italic">
                {stagedIndex !== null ? activities[stagedIndex]?.name : (currentIndex !== null && currentIndex < activities.length - 1 ? activities[currentIndex + 1]?.name : 'None')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <div className={`w-2 h-2 rounded-full ${timerState === TimerState.RUNNING ? 'bg-green-500 animate-pulse' : 'bg-gray-800'}`} />
            <span className="text-[8px] text-green-900 font-bold uppercase tracking-tighter">Remote Link Active</span>
          </div>
        </div>

        {/* Event Creator Section - Fixed */}
        <div className={`p-6 border-b shrink-0 ${isDark ? 'bg-[#121212] border-[#222]' : 'bg-white border-gray-200'}`}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Add New Schedule</span>
              <input 
                type="text" 
                placeholder="Search or Event Title..."
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className={`w-full p-4 rounded-2xl border font-bold text-sm uppercase tracking-tight outline-none transition-all ${isDark ? 'bg-[#1a1a1a] border-[#333] text-white focus:border-orange-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-orange-600'}`}
              />
            </div>
            
            <div className="flex gap-3">
              {[
                { label: 'HH', value: hh, setter: setHh, max: 23 },
                { label: 'MM', value: mm, setter: setMm, max: 59 },
                { label: 'SS', value: ss, setter: setSs, max: 59 }
              ].map((item) => (
                <div key={item.label} className="flex-1 flex flex-col gap-1">
                  <span className={`text-[8px] font-black text-center ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{item.label}</span>
                  <input 
                    type="number"
                    min="0"
                    max={item.max}
                    value={item.value}
                    onChange={(e) => item.setter(Math.max(0, Math.min(item.max, parseInt(e.target.value) || 0)))}
                    className={`w-full p-3 rounded-xl border text-center font-mono text-sm outline-none transition-all ${isDark ? 'bg-[#1a1a1a] border-[#333] text-orange-500' : 'bg-gray-50 border-gray-200 text-orange-600'}`}
                  />
                </div>
              ))}
            </div>

            <button 
              onClick={handleAddActivity}
              className="w-full p-4 rounded-2xl bg-orange-600 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-600/20 active:scale-95 transition-all"
            >
              Add to Schedule
            </button>
          </div>
        </div>

        {/* Schedule List Section - Scrollable */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
          <div className="flex justify-between items-center shrink-0">
            <h2 className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Scheduled List</h2>
            <span className={`text-[10px] font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{activities.length} Events</span>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 no-scrollbar pb-4">
            {activities.map((activity, index) => (
              <ActivityItem 
                key={activity.id}
                activity={activity}
                index={index}
                currentIndex={currentIndex}
                stagedIndex={stagedIndex}
                isDark={isDark}
                onMove={handleMoveActivity}
                onUpdateTitle={handleUpdateTitle}
                onUpdateDuration={handleUpdateDuration}
                onDelete={handleDeleteActivity}
                onSelect={(idx) => sendCommand('SELECT_ACTIVITY', idx)}
                onGoLive={handleGoLive}
                formatTime={formatTime}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Controls Bar */}
      <div className={`p-4 border-t flex flex-col gap-4 shrink-0 ${isDark ? 'bg-[#121212] border-[#222]' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button 
              onClick={() => sendCommand('PREV_ACTIVITY')} 
              className={`p-3 rounded-xl transition-all active:scale-90 ${isDark ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-black/5 text-gray-500 hover:text-gray-900'}`}
              title="Previous"
            >
              <SkipBack size={20} />
            </button>
            <button 
              onClick={() => sendCommand('NEXT_ACTIVITY')} 
              className={`p-3 rounded-xl transition-all active:scale-90 ${isDark ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-black/5 text-gray-500 hover:text-gray-900'}`}
              title="Next"
            >
              <SkipForward size={20} />
            </button>
          </div>
          
          <button 
            onClick={() => sendCommand(timerState === TimerState.RUNNING ? 'PAUSE_TIMER' : 'START_TIMER')}
            className={`flex-1 max-w-[120px] py-3 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
              timerState === TimerState.RUNNING 
                ? 'bg-orange-600 text-white shadow-orange-600/20' 
                : 'bg-emerald-600 text-white shadow-emerald-600/20'
            }`}
          >
            {timerState === TimerState.RUNNING ? <Pause size={20} /> : <Play size={20} />}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {timerState === TimerState.RUNNING ? 'Pause' : 'Start'}
            </span>
          </button>

          <div className="flex gap-2">
            <button 
              onClick={() => sendCommand('ADJUST_TIME', -60)} 
              className={`p-3 rounded-xl transition-all active:scale-90 ${isDark ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-black/5 text-gray-500 hover:text-gray-900'}`}
              title="Minus 1m"
            >
              <Minus size={20} />
            </button>
            <button 
              onClick={() => sendCommand('ADJUST_TIME', 60)} 
              className={`p-3 rounded-xl transition-all active:scale-90 ${isDark ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-black/5 text-gray-500 hover:text-gray-900'}`}
              title="Plus 1m"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button 
            onClick={() => sendCommand('RESET_TIMER')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all active:scale-95 ${isDark ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
          >
            <RotateCcw size={16} />
            <span className="text-[9px] font-black uppercase tracking-widest">Reset</span>
          </button>
          <button 
            onClick={() => sendCommand('CLEAR_TIMER')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all active:scale-95 ${isDark ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
          >
            <X size={16} />
            <span className="text-[9px] font-black uppercase tracking-widest">Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemoteView;
