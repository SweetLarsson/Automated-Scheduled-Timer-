
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { TimerState, Theme, ControlAction, AppSettings } from '../types';
import TimerDisplayVisual from './TimerDisplayVisual';
import { soundService } from '../services/soundService';

const ProjectionView: React.FC = () => {
  const [syncData, setSyncData] = useState(() => {
    // Try to get initial theme from app theme key first for faster persistence
    const appTheme = localStorage.getItem('service_timer_theme') as Theme;
    const initialTheme = (appTheme === 'light' || appTheme === 'dark') ? appTheme : 'dark';
    
    // Check if there is already sync data
    const stored = localStorage.getItem('service_timer_sync_data');
    const storedSettings = localStorage.getItem('service_timer_settings');
    
    let settings: AppSettings | undefined;
    if (storedSettings) {
      try {
        settings = JSON.parse(storedSettings);
      } catch (e) {}
    }

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          name: parsed.name || "",
          nextName: parsed.nextName || "",
          time: parsed.time || 0,
          state: parsed.state || TimerState.IDLE,
          theme: parsed.theme || initialTheme,
          settings: parsed.settings || settings
        };
      } catch (e) {
        console.error("Initial load failed", e);
      }
    }
    
    return {
      name: "",
      nextName: "",
      time: 0,
      state: TimerState.IDLE,
      theme: initialTheme,
      settings: settings
    };
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const triggeredMilestones = useRef<Set<string>>(new Set());
  const wakeLockRef = useRef<any>(null);
  const lastTapRef = useRef<number>(0);

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
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
    const shouldLock = isFullscreen && (syncData.state === TimerState.RUNNING || syncData.state === TimerState.TRANSITION);
    if (shouldLock) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldLock) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isFullscreen, syncData.state, requestWakeLock, releaseWakeLock]);

  // Synchronize document theme class for the projector document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', syncData.theme === 'dark');
  }, [syncData.theme]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('service_timer_sync');
    channelRef.current = channel;
    
    const updateState = (data: any) => {
      if (data && typeof data === 'object' && data.state) {
        setSyncData(prev => ({...prev, ...data}));
      }
    };

    // Socket support for cross-device projection
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    if (session) {
      const socket = io();
      socketRef.current = socket;
      socket.emit('join-room', session);
      socket.on('state-updated', (state) => {
        updateState(state);
      });
    }

    channel.onmessage = (event) => updateState(event.data);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'service_timer_sync_data' && e.newValue) {
        try {
          updateState(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Sync parsing error", err);
        }
      }
      // Also listen for theme-specific changes
      if (e.key === 'service_timer_theme' && e.newValue) {
        setSyncData(prev => ({ ...prev, theme: e.newValue as Theme }));
      }
    };
    window.addEventListener('storage', handleStorage);

    channel.postMessage('request_sync');

    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.repeat) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        sendControl(ControlAction.PLAY_PAUSE);
        break;
      case 'p':
      case 'P':
        e.preventDefault();
        sendControl(ControlAction.PREVIOUS);
        break;
      case 'n':
      case 'N':
        e.preventDefault();
        sendControl(ControlAction.NEXT);
        break;
      case 'Delete':
        e.preventDefault();
        sendControl(ControlAction.RESET);
        break;
      case 'Backspace':
        e.preventDefault();
        sendControl(ControlAction.CLEAR);
        break;
      case 'i':
      case 'I':
        e.preventDefault();
        sendControl(ControlAction.INCREMENT);
        break;
      case 'd':
      case 'D':
        e.preventDefault();
        sendControl(ControlAction.DECREMENT);
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
    }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      channel.close();
      channelRef.current = null;
      if (socketRef.current) socketRef.current.disconnect();
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (syncData.state !== TimerState.RUNNING) {
      if (syncData.state === TimerState.IDLE) {
        triggeredMilestones.current.clear();
      }
      return;
    }

    const milestoneKey = `${syncData.name}-${syncData.time}`;
    if (triggeredMilestones.current.has(milestoneKey)) return;

    const settings = syncData.settings;
    if (!settings) return;

    // Milestone Notification
    if (syncData.time === settings.milestoneNotificationTime) {
      triggeredMilestones.current.add(milestoneKey);
      if (settings.enableBeeps) {
        soundService.playAlert(settings.alertSound, 'short');
      }
    }

    // Voice Readout at 00:01
    if (syncData.time === 1 && settings.enableVoice && syncData.state === TimerState.RUNNING) {
      triggeredMilestones.current.add(milestoneKey);
      if (syncData.nextName) {
        const duration = (syncData as any).nextDuration || 0;
        soundService.announceUpNext(syncData.nextName, duration, settings.voiceGender);
      }
    }

    // Timer Finished
    if (syncData.time === 0 && (syncData.state === TimerState.RUNNING || syncData.state === TimerState.TRANSITION)) {
      triggeredMilestones.current.add(milestoneKey);
      if (settings.enableBeeps) {
        soundService.playAlert(settings.alertSound, 'long');
      }
    }
  }, [syncData]);

  const sendControl = (action: ControlAction) => {
    if (!channelRef.current) return;
    try {
      channelRef.current.postMessage({ type: 'control', action });
    } catch (e) {
      if (e instanceof Error && e.message.includes('closed')) {
        channelRef.current = null;
      } else {
        console.error("Failed to send control", e);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Fullscreen request rejected: ${err.message}`);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleScreenClick = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (isFullscreen) {
        setShowControls(prev => !prev);
      } else {
        toggleFullscreen();
      }
    } else {
      // Single tap logic
      if (!isFullscreen) {
        toggleFullscreen();
      }
    }
    lastTapRef.current = now;
  };

  const handleNameChange = (newName: string) => {
    if (!channelRef.current) return;
    try {
      channelRef.current.postMessage({ 
        type: 'control', 
        action: ControlAction.UPDATE_NAME, 
        payload: newName 
      });
    } catch (e) {
      console.error("Failed to send name update", e);
    }
  };

  const isDark = syncData.theme === 'dark';

  return (
    <div 
      ref={containerRef}
      className={`w-screen h-screen flex flex-col items-center justify-center overflow-hidden cursor-default group transition-colors duration-1000 ${isDark ? 'bg-black' : 'bg-white'}`}
      onClick={handleScreenClick}
    >
      <div className="w-full h-full">
        <TimerDisplayVisual 
          name={syncData.name} 
          nextName={syncData.nextName}
          time={syncData.time} 
          state={syncData.state} 
          theme={syncData.theme}
          isEditable={true}
          onNameChange={handleNameChange}
        />
      </div>

      {/* Hover Controls at the bottom */}
      <div className={`absolute bottom-0 left-0 right-0 h-24 flex items-end justify-center pb-6 transition-opacity duration-300 z-50 group/controls ${showControls ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
        <div 
          onClick={(e) => e.stopPropagation()}
          className={`flex items-center gap-4 px-6 py-2 rounded-full border shadow-2xl backdrop-blur-md transition-all duration-500 transform translate-y-4 group-hover/controls:translate-y-0 ${showControls ? 'translate-y-0' : ''} ${isDark ? 'bg-black/60 border-white/10' : 'bg-white/60 border-gray-200'}`}
        >
          <button 
            onClick={() => sendControl(ControlAction.PLAY_PAUSE)}
            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-colors ${isDark ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-black hover:bg-black/5'}`}
          >
            {(syncData.state === TimerState.RUNNING || syncData.state === TimerState.TRANSITION) ? 'Pause' : 'Play'}
          </button>
          <div className={`w-[1px] h-4 ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div>
          <button 
            onClick={() => sendControl(ControlAction.PREVIOUS)}
            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-colors ${isDark ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-black hover:bg-black/5'}`}
          >
            Previous Event
          </button>
          <button 
            onClick={() => sendControl(ControlAction.NEXT)}
            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-colors ${isDark ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-black hover:bg-black/5'}`}
          >
            Next Event
          </button>
          <div className={`w-[1px] h-4 ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div>
          <button 
            onClick={() => sendControl(ControlAction.RESET)}
            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-colors ${isDark ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-black hover:bg-black/5'}`}
          >
            Reset
          </button>

          {/* Expandable Event Title */}
          <div className="group/title relative flex items-center">
            <div className={`max-w-[120px] group-hover/title:max-w-[400px] transition-all duration-500 overflow-hidden whitespace-nowrap px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-black/5 border-black/10 text-gray-700'}`}>
              {syncData.name || 'No Active Event'}
            </div>
          </div>

          <button 
            onClick={() => sendControl(ControlAction.CLEAR)}
            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-red-600 hover:text-red-700 hover:bg-red-500/5'}`}
          >
            Clear Live
          </button>
          <div className={`w-[1px] h-4 ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div>
          <button 
            onClick={() => sendControl(ControlAction.DECREMENT)}
            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${isDark ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-500/5'}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
            1m
          </button>
          <button 
            onClick={() => sendControl(ControlAction.INCREMENT)}
            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${isDark ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-500/5'}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            1m
          </button>
        </div>
      </div>

      {!isFullscreen && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity opacity-0 group-hover:opacity-100 pointer-events-none ${isDark ? 'bg-black/60' : 'bg-white/60'} backdrop-blur-[2px]`}>
           <div className={`border p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4 text-center pointer-events-auto ${isDark ? 'bg-[#1e1e1e] border-[#444]' : 'bg-white border-gray-200'}`}>
             <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center animate-pulse mb-2">
               <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
             </div>
             <h3 className={`text-xl font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-gray-900'}`}>Click to Go Fullscreen</h3>
             <p className={`text-sm max-w-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Drag this to your projector, then click to hide browser UI.</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default ProjectionView;
