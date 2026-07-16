
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, X, Copy, Check } from 'lucide-react';
import { Activity, TimerState, Theme, ControlAction, AppSettings } from '../types';
import EventCreator from './EventCreator';
import ScheduleList from './ScheduleList';
import CountdownDisplay from './CountdownDisplay';
import SpeechAssistant from './SpeechAssistant';
import SettingsPanel from './SettingsPanel';
import { soundService } from '../services/soundService';

interface Props {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

const QRCodeModal = React.memo(({ isOpen, onClose, isDark, sessionId }: { isOpen: boolean; onClose: () => void; isDark: boolean; sessionId: string }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;
  const remoteUrl = `${window.location.origin}${window.location.pathname}?session=${sessionId}#remote`;

  const handleCopy = () => {
    navigator.clipboard.writeText(remoteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className={`relative w-full max-w-sm p-8 rounded-[2.5rem] border shadow-2xl flex flex-col items-center gap-6 ${isDark ? 'bg-[#121212] border-[#333]' : 'bg-white border-gray-200'}`}>
        <button 
          onClick={onClose}
          className={`absolute top-6 right-6 p-2 rounded-full transition-all ${isDark ? 'bg-white/5 text-gray-500 hover:text-white' : 'bg-black/5 text-gray-400 hover:text-gray-900'}`}
        >
          <X size={20} />
        </button>
        
        <div className="flex flex-col items-center text-center gap-2">
          <h2 className={`text-xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>Remote Control</h2>
          <p className={`text-xs font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Scan this code to control the timer from your phone</p>
        </div>

        <div className={`p-6 rounded-3xl bg-white shadow-inner flex items-center justify-center`}>
          <QRCodeCanvas 
            value={remoteUrl}
            size={200}
            level="H"
            includeMargin={false}
          />
        </div>

        <div className="w-full flex flex-col gap-2">
          <div className={`w-full p-4 rounded-2xl border flex flex-col gap-1 relative group ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Remote URL</span>
            <span className={`text-[10px] font-mono break-all pr-8 ${isDark ? 'text-orange-500' : 'text-orange-600'}`}>
              {remoteUrl}
            </span>
            <button 
              onClick={handleCopy}
              className={`absolute right-3 bottom-3 p-2 rounded-lg transition-all ${isDark ? 'bg-white/10 text-gray-400 hover:text-white' : 'bg-black/10 text-gray-500 hover:text-gray-900'}`}
              title="Copy to clipboard"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          </div>
          
          {/* Toast Notification */}
          <div className={`transition-all duration-300 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-[10px] font-black uppercase tracking-widest ${copied ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'} ${isDark ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-green-50 text-green-600 border border-green-200'}`}>
            <Check size={12} /> Link Copied to Clipboard
          </div>
        </div>
      </div>
    </div>
  );
});

const TimerApp: React.FC<Props> = ({ settings, onUpdateSettings }) => {
  const theme = settings.theme;
  const onToggleTheme = () => onUpdateSettings({ ...settings, theme: theme === 'dark' ? 'light' : 'dark' });
  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('service_timer_activities');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse activities from localStorage", e);
      return [];
    }
  });
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [stagedIndex, setStagedIndex] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [timerState, setTimerState] = useState<TimerState>(TimerState.IDLE);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);
  const [sessionId] = useState(() => {
    const saved = localStorage.getItem('service_timer_session_id');
    if (saved) return saved;
    const newId = Math.random().toString(36).substr(2, 9);
    localStorage.setItem('service_timer_session_id', newId);
    return newId;
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number | null>(null);

  // Use a ref to store the latest state for socket sync
  const stateRef = useRef({
    activities,
    currentIndex,
    stagedIndex,
    remainingTime,
    timerState,
    theme,
    endTime: endTimeRef.current
  });

  useEffect(() => {
    stateRef.current = {
      activities,
      currentIndex,
      stagedIndex,
      remainingTime,
      timerState,
      theme,
      endTime: endTimeRef.current
    };
  }, [activities, currentIndex, stagedIndex, remainingTime, timerState, theme]);

  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggeredMilestones = useRef<Set<string>>(new Set());
  const wakeLockRef = useRef<any>(null);
  const lastTapRef = useRef<number>(0);
  const prePauseStateRef = useRef<TimerState | null>(null);
  const [showTheaterControls, setShowTheaterControls] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        localStorage.setItem('service_timer_activities', JSON.stringify(activities));
        // Optional: show a toast or some feedback
        console.log('Schedule saved manually');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activities]);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.emit('join-room', sessionId);

    socket.on('user-joined', () => {
      socket.emit('sync-state', {
        roomId: sessionId,
        state: stateRef.current
      });
    });

    socket.on('command-received', (command) => {
      const h = handlersRef.current;
      if (!h) return;

      switch (command.type) {
        case ControlAction.PLAY_PAUSE:
          if (h.timerState === TimerState.RUNNING || h.timerState === TimerState.TRANSITION) h.pauseTimer();
          else h.startTimer();
          break;
        case ControlAction.PREVIOUS:
        case 'PREV_ACTIVITY':
          h.handlePrevious();
          break;
        case ControlAction.NEXT:
        case 'NEXT_ACTIVITY':
          h.proceedToNext();
          break;
        case ControlAction.RESET:
        case 'RESET_TIMER':
          h.handleReset();
          break;
        case ControlAction.CLEAR:
        case 'CLEAR_TIMER':
          h.handleClearTimer();
          break;
        case 'SELECT_ACTIVITY':
          setStagedIndex(command.payload);
          break;
        case 'TAKE_ACTIVITY':
          handleLoadActivity(command.payload);
          break;
        case 'GO_LIVE':
          // If payload is provided, load that index first
          if (command.payload !== undefined && command.payload !== null) {
            handleLoadActivity(command.payload);
          } else if (stagedIndex !== null) {
            handleLoadActivity(stagedIndex);
          }
          // Start the timer after a small delay to ensure state is updated
          setTimeout(() => {
            handlersRef.current.startTimer();
          }, 50);
          break;
        case 'START_TIMER':
          h.startTimer();
          break;
        case 'PAUSE_TIMER':
          h.pauseTimer();
          break;
        case 'ADJUST_TIME':
          h.handleAdjustTime(command.payload);
          break;
      }
    });

    socket.on('state-updated', (state) => {
      if (state.activities) setActivities(state.activities);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.emit('sync-state', {
        roomId: sessionId,
        state: {
          activities,
          currentIndex,
          stagedIndex,
          remainingTime,
          timerState,
          theme,
          endTime: endTimeRef.current // Send endTime for smoother remote sync
        }
      });
    }
  }, [activities, currentIndex, stagedIndex, Math.floor(remainingTime), timerState, theme, sessionId]);

  const isDark = theme === 'dark';

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
    const shouldLock = isTheaterMode && (timerState === TimerState.RUNNING || timerState === TimerState.TRANSITION);
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
  }, [isTheaterMode, timerState, requestWakeLock, releaseWakeLock]);

  const handleTheaterClick = () => {
    if (!isTheaterMode) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setShowTheaterControls(prev => !prev);
    }
    lastTapRef.current = now;
  };

  // Persist activities to localStorage
  useEffect(() => {
    localStorage.setItem('service_timer_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    if (timerState !== TimerState.RUNNING) return;

    const milestoneKey = `${currentIndex}-${remainingTime}`;
    if (triggeredMilestones.current.has(milestoneKey)) return;

    // Milestone Notification
    if (remainingTime === settings.milestoneNotificationTime) {
      triggeredMilestones.current.add(milestoneKey);
      if (settings.enableBeeps) {
        soundService.playAlert(settings.alertSound, 'short');
      }
    }

    // Voice Readout at 00:01
    if (remainingTime === 1 && settings.enableVoice && timerState === TimerState.RUNNING) {
      triggeredMilestones.current.add(milestoneKey);
      const nextActivity = (currentIndex !== null && currentIndex < activities.length - 1) 
        ? activities[currentIndex + 1] 
        : null;
      
      if (nextActivity) {
        soundService.announceUpNext(nextActivity.name, nextActivity.durationSeconds, settings.voiceGender);
      }
    }

    // Timer Finished (Transition or End)
    if (remainingTime === 0 && (timerState === TimerState.RUNNING || timerState === TimerState.TRANSITION)) {
      triggeredMilestones.current.add(milestoneKey);
      if (settings.enableBeeps) {
        soundService.playAlert(settings.alertSound, 'long');
      }
    }
  }, [remainingTime, timerState, currentIndex, activities, settings]);

  const handleUpdateTitle = () => {
    if (currentIndex !== null && editingTitle !== null) {
      const newActivities = [...activities];
      newActivities[currentIndex] = { ...newActivities[currentIndex], name: editingTitle };
      setActivities(newActivities);
    }
    setEditingTitle(null);
    setIsEditingTitle(false);
  };

  const broadcastState = useCallback(() => {
    if (!channelRef.current) return;
    
    try {
      const currentActivity = currentIndex !== null ? activities[currentIndex] : null;
      const nextActivity = (currentIndex !== null && currentIndex < activities.length - 1) 
        ? activities[currentIndex + 1] 
        : null;

      const data = {
        name: currentActivity ? currentActivity.name : "",
        nextName: nextActivity ? nextActivity.name : "",
        nextDuration: nextActivity ? nextActivity.durationSeconds : 0,
        time: remainingTime,
        state: timerState,
        theme: theme,
        settings: settings,
        timestamp: Date.now()
      };
      
      channelRef.current.postMessage(data);
      localStorage.setItem('service_timer_sync_data', JSON.stringify(data));
    } catch (e) {
      // Ignore "Channel is closed" errors during unmount
      if (e instanceof Error && e.message.includes('closed')) {
        channelRef.current = null;
      } else {
        console.error("Broadcast failed", e);
      }
    }
  }, [remainingTime, timerState, currentIndex, activities, theme]);

  useEffect(() => { broadcastState(); }, [broadcastState]);

  const handleAddActivity = (name: string, seconds: number) => {
    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      durationSeconds: seconds
    };
    setActivities(prev => [...prev, newActivity]);
  };

  const handleClearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerState(TimerState.IDLE);
    setRemainingTime(0);
    setCurrentIndex(null);
    triggeredMilestones.current.clear();
    prePauseStateRef.current = null;
  }, []);

  const handleClearSchedule = () => {
    handleClearTimer();
    setActivities([]);
    setStagedIndex(null);
  };

  const handleSaveSchedule = () => {
    if (activities.length === 0) return;
    const blob = new Blob([JSON.stringify(activities, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `service_schedule_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteActivity = (id: string) => {
    const deletedIndex = activities.findIndex(a => a.id === id);
    if (deletedIndex === -1) return;
    const newActivities = activities.filter(a => a.id !== id);
    setActivities(newActivities);
    if (currentIndex === deletedIndex) handleClearTimer();
    else if (currentIndex !== null && deletedIndex < currentIndex) setCurrentIndex(currentIndex - 1);
    
    // Adjust staged index if necessary
    if (stagedIndex === deletedIndex) setStagedIndex(null);
    else if (stagedIndex !== null && deletedIndex < stagedIndex) setStagedIndex(stagedIndex - 1);
  };

  const handleReorder = (newActivities: Activity[]) => {
    // Find the current activity and staged activity by ID to update their indices
    const currentId = currentIndex !== null ? activities[currentIndex]?.id : null;
    const stagedId = stagedIndex !== null ? activities[stagedIndex]?.id : null;
    
    setActivities(newActivities);
    
    if (currentId) {
      const newCurrentIndex = newActivities.findIndex(a => a.id === currentId);
      if (newCurrentIndex !== -1) setCurrentIndex(newCurrentIndex);
    }
    
    if (stagedId) {
      const newStagedIndex = newActivities.findIndex(a => a.id === stagedId);
      if (newStagedIndex !== -1) setStagedIndex(newStagedIndex);
    }
  };

  const toggleTheaterMode = () => {
    if (!isTheaterMode) {
      setIsTheaterMode(true);
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      setIsTheaterMode(false);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) setIsTheaterMode(false);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const selectActivity = (index: number) => setStagedIndex(index);

  const handleLoadActivity = useCallback((index: number) => {
    if (index < 0 || index >= activities.length) return;
    handleClearTimer();
    setCurrentIndex(index);
    setRemainingTime(activities[index].durationSeconds);
    setTimerState(TimerState.IDLE);
    setStagedIndex(null);
    triggeredMilestones.current.clear();
  }, [activities, handleClearTimer]);

  const handleGoLive = useCallback(() => {
    if (stagedIndex === null) return;
    handleLoadActivity(stagedIndex);
  }, [stagedIndex, handleLoadActivity]);

  const startTimer = useCallback(() => {
    let currentRemaining = remainingTime;
    if (currentIndex === null && activities.length > 0) {
      const targetIndex = stagedIndex !== null ? stagedIndex : 0;
      setCurrentIndex(targetIndex);
      currentRemaining = activities[targetIndex].durationSeconds;
      setRemainingTime(currentRemaining);
      setStagedIndex(null);
      triggeredMilestones.current.clear();
    } else if (stagedIndex !== null) {
      // If something is staged and we hit start, go live automatically
      handleGoLive();
      return; // handleGoLive will set state, effect will pick it up
    }
    
    endTimeRef.current = Date.now() + currentRemaining * 1000;
    const nextState = prePauseStateRef.current === TimerState.TRANSITION ? TimerState.TRANSITION : TimerState.RUNNING;
    setTimerState(nextState);
    prePauseStateRef.current = null;
  }, [currentIndex, activities, stagedIndex, handleGoLive, remainingTime]);

  const pauseTimer = useCallback(() => {
    if (timerState === TimerState.RUNNING || timerState === TimerState.TRANSITION) {
      prePauseStateRef.current = timerState;
      if (endTimeRef.current) {
        const now = Date.now();
        const timeLeft = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
        setRemainingTime(timeLeft);
      }
      setTimerState(TimerState.PAUSED);
      endTimeRef.current = null;
    }
  }, [timerState]);

  const handleReset = useCallback(() => {
    if (currentIndex !== null && activities[currentIndex]) {
      const duration = activities[currentIndex].durationSeconds;
      setRemainingTime(duration);
      triggeredMilestones.current.clear();
      prePauseStateRef.current = TimerState.RUNNING;
      if (timerState === TimerState.RUNNING || timerState === TimerState.TRANSITION) {
        endTimeRef.current = Date.now() + duration * 1000;
      }
    } else {
      setTimerState(TimerState.IDLE);
    }
  }, [currentIndex, activities, timerState]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prevIndex => {
      if (prevIndex !== null && prevIndex > 0) {
        const nextIndex = prevIndex - 1;
        const duration = activities[nextIndex].durationSeconds;
        setRemainingTime(duration);
        triggeredMilestones.current.clear();
        endTimeRef.current = Date.now() + duration * 1000;
        setTimerState(TimerState.RUNNING);
        return nextIndex;
      }
      return prevIndex;
    });
  }, [activities]);

  const handleAdjustTime = useCallback((seconds: number) => {
    if (endTimeRef.current) {
      endTimeRef.current += seconds * 1000;
    }
    setRemainingTime(prev => Math.max(0, prev + seconds));
  }, []);

  const proceedToNext = useCallback(() => {
    setCurrentIndex(prevIndex => {
      if (prevIndex !== null && prevIndex < activities.length - 1) {
        const nextIndex = prevIndex + 1;
        const duration = activities[nextIndex].durationSeconds;
        setRemainingTime(duration);
        triggeredMilestones.current.clear();
        endTimeRef.current = Date.now() + duration * 1000;
        setTimerState(TimerState.RUNNING);
        return nextIndex;
      }
      setTimerState(TimerState.IDLE);
      setRemainingTime(0);
      endTimeRef.current = null;
      triggeredMilestones.current.clear();
      return null;
    });
  }, [activities]);

  const handleTimerEnd = useCallback(() => {
    if (currentIndex !== null && currentIndex < activities.length - 1) {
      setTimerState(TimerState.TRANSITION);
      const transitionTime = 5;
      setRemainingTime(transitionTime);
      triggeredMilestones.current.clear();
      endTimeRef.current = Date.now() + transitionTime * 1000;
    } else {
      setTimerState(TimerState.IDLE);
      setRemainingTime(0);
      setCurrentIndex(null);
      endTimeRef.current = null;
      triggeredMilestones.current.clear();
    }
  }, [currentIndex, activities]);

  useEffect(() => {
    if (timerState === TimerState.RUNNING || timerState === TimerState.TRANSITION) {
      // Ensure endTime is set if it was missing (e.g. on mount or state change)
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + remainingTime * 1000;
      }

      timerRef.current = setInterval(() => {
        if (endTimeRef.current) {
          const now = Date.now();
          const timeLeft = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
          
          setRemainingTime(prev => {
            if (prev === timeLeft) return prev;
            return timeLeft;
          });

          if (now >= endTimeRef.current) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            endTimeRef.current = null;
            if (timerState === TimerState.TRANSITION) proceedToNext();
            else handleTimerEnd();
          }
        }
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      endTimeRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerState, handleTimerEnd, proceedToNext]);

  // Voice Handlers
  const voiceHandlers = React.useMemo(() => ({
    stage_event: (name: string) => {
      if (!name) return "Please specify an event name.";
      const idx = activities.findIndex(a => a.name && a.name.toLowerCase().includes(name.toLowerCase()));
      if (idx !== -1) {
        setStagedIndex(idx);
        return `Okay, staged ${activities[idx].name}.`;
      }
      return `I couldn't find ${name} in the schedule.`;
    },
    take_live: () => {
      if (stagedIndex !== null) {
        handleGoLive();
        startTimer();
        return "Taking it live now.";
      }
      return "There's nothing in the staging area.";
    },
    start_timer: () => {
      if (stagedIndex !== null) {
        handleGoLive();
        startTimer();
        return "Staged event is now live.";
      }
      startTimer();
      return "Timer started.";
    },
    pause_timer: () => {
      pauseTimer();
      return "Timer paused.";
    },
    reset_timer: () => {
      handleReset();
      return "Timer reset.";
    },
    clear_timer: () => {
      handleClearTimer();
      return "Timer cleared.";
    }
  }), [activities, stagedIndex, handleGoLive, startTimer, pauseTimer, handleReset, handleClearTimer]);

  const stagedActivity = stagedIndex !== null ? activities[stagedIndex] : null;

  // Use a ref to store latest handlers to avoid useEffect re-runs
  const handlersRef = useRef({ 
    startTimer, pauseTimer, handlePrevious, proceedToNext, 
    handleClearTimer, handleReset, handleAdjustTime, 
    broadcastState, timerState 
  });
  
  useEffect(() => {
    handlersRef.current = { 
      startTimer, pauseTimer, handlePrevious, proceedToNext, 
      handleClearTimer, handleReset, handleAdjustTime, 
      broadcastState, timerState 
    };
  }, [startTimer, pauseTimer, handlePrevious, proceedToNext, handleClearTimer, handleReset, handleAdjustTime, broadcastState, timerState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.repeat) return;
      
      const h = handlersRef.current;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (h.timerState === TimerState.RUNNING || h.timerState === TimerState.TRANSITION) h.pauseTimer();
          else h.startTimer();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          h.handlePrevious();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          h.proceedToNext();
          break;
        case 'Delete':
          e.preventDefault();
          h.handleReset();
          break;
        case 'Backspace':
          e.preventDefault();
          h.handleClearTimer();
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          h.handleAdjustTime(60);
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          h.handleAdjustTime(-60);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleTheaterMode();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('service_timer_sync');
    channelRef.current = channel;
    channel.onmessage = (event) => {
      if (event.data === 'request_sync') {
        handlersRef.current.broadcastState();
      } else if (event.data && typeof event.data === 'object' && event.data.type === 'control') {
        const action = event.data.action as ControlAction;
        const h = handlersRef.current;
        switch (action) {
          case ControlAction.PLAY_PAUSE:
            if (h.timerState === TimerState.RUNNING || h.timerState === TimerState.TRANSITION) h.pauseTimer();
            else h.startTimer();
            break;
          case ControlAction.PREVIOUS:
            h.handlePrevious();
            break;
          case ControlAction.NEXT:
            h.proceedToNext();
            break;
          case ControlAction.CLEAR:
            h.handleClearTimer();
            break;
          case ControlAction.RESET:
            h.handleReset();
            break;
          case ControlAction.INCREMENT:
            h.handleAdjustTime(60);
            break;
          case ControlAction.DECREMENT:
            h.handleAdjustTime(-60);
            break;
        }
      }
    };
    return () => { 
      channel.close(); 
      channelRef.current = null;
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-col xl:flex-row w-full h-full xl:h-screen box-border items-stretch transition-all duration-500 ${isTheaterMode ? 'p-0 gap-0 no-scrollbar overflow-hidden' : 'p-4 gap-4 overflow-y-auto xl:overflow-hidden'} ${isDark ? 'bg-[#121212]' : 'bg-[#f3f4f6]'}`}
    >
      
      <SpeechAssistant 
        isActive={isVoiceActive} 
        handlers={voiceHandlers}
      />

      <section className={`flex-1 flex flex-col gap-4 rounded-2xl p-6 border shadow-2xl min-h-[500px] xl:h-full overflow-hidden transition-all duration-500 ${isTheaterMode ? 'hidden xl:hidden' : 'flex'} ${isDark ? 'bg-[#1e1e1e] border-[#333]' : 'bg-white border-gray-200'}`}>
        <div className={`border p-4 rounded-xl flex justify-between items-center transition-all duration-500 ${isDark ? 'bg-[#262626] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
          <h2 className={`font-bold text-sm uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Load Event</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsQRCodeOpen(true)}
              className={`p-2 rounded-lg transition-all ${isDark ? 'bg-[#333] hover:bg-orange-600 text-gray-400 hover:text-white' : 'bg-gray-200 hover:bg-orange-600 text-gray-600 hover:text-white'}`}
              title="Remote Control QR"
            >
              <QrCode className="w-5 h-5" />
            </button>
            <button 
              onClick={toggleTheaterMode}
              className={`p-2 rounded-lg transition-all ${isDark ? 'bg-[#333] hover:bg-orange-600 text-gray-400 hover:text-white' : 'bg-gray-200 hover:bg-orange-600 text-gray-600 hover:text-white'}`}
              title="Theater Mode"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2 rounded-lg transition-all ${isDark ? 'bg-[#333] hover:bg-orange-600 text-gray-400 hover:text-white' : 'bg-gray-200 hover:bg-orange-600 text-gray-600 hover:text-white'}`}
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
           <EventCreator onAdd={handleAddActivity} theme={theme} isVoiceActive={isVoiceActive} onToggleVoice={() => setIsVoiceActive(!isVoiceActive)} />
        </div>
      </section>

      <section className={`flex-1 flex flex-col gap-4 rounded-2xl p-6 border shadow-2xl min-h-[500px] xl:h-full overflow-hidden transition-all duration-500 ${isTheaterMode ? 'hidden xl:hidden' : 'flex'} ${isDark ? 'bg-[#1e1e1e] border-[#333]' : 'bg-white border-gray-200'}`}>
        <div className={`flex flex-col flex-1 border rounded-2xl p-4 overflow-hidden transition-all duration-500 ${isDark ? 'bg-[#181818] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
          <h2 className={`border p-4 rounded-xl text-center font-bold text-sm uppercase tracking-widest flex justify-between items-center px-6 transition-all duration-500 ${isDark ? 'bg-[#262626] border-[#333] text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>
            Schedule 
            <span className="text-orange-500 font-mono text-xl">{currentTime.toLocaleTimeString([], { hour12: false })}</span>
          </h2>
          
          <div className="mt-6 flex flex-col flex-1 overflow-hidden">
            <ScheduleList 
              activities={activities} 
              currentIndex={currentIndex} 
              stagedIndex={stagedIndex}
              remainingTime={remainingTime}
              timerState={timerState}
              onSelect={selectActivity} 
              onDelete={handleDeleteActivity}
              onReorder={handleReorder}
              theme={theme}
              isVoiceActive={isVoiceActive}
            />
          </div>

          <div className={`mt-4 p-4 rounded-xl border transition-all duration-300 flex flex-col gap-3 shadow-lg ${stagedActivity ? (isDark ? 'bg-purple-600/10 border-purple-500/50' : 'bg-purple-50 border-purple-200') : (isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200')}`}>
            <div className="flex justify-between items-center px-1">
              <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${stagedActivity ? (isDark ? 'text-purple-400' : 'text-purple-600') : (isDark ? 'text-gray-600' : 'text-gray-400')}`}>Staging Area</span>
              {stagedActivity && (
                <button onClick={() => setStagedIndex(null)} className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>Clear</button>
              )}
            </div>
            {stagedActivity ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col overflow-hidden">
                  <span className={`font-bold text-sm truncate uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{stagedActivity.name}</span>
                  <span className={`font-mono text-xs ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{stagedActivity.durationSeconds}s</span>
                </div>
                <button onClick={handleGoLive} className={`px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg active:scale-95 border-b-4 ${isDark ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-800' : 'bg-purple-600 hover:bg-purple-700 text-white border-purple-900'}`}>Take Live</button>
              </div>
            ) : (
              <div className="py-2 text-center">
                 <span className={`${isDark ? 'text-gray-700' : 'text-gray-300'} text-[11px] font-medium italic`}>Select an item to stage</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
           <button type="button" onClick={handleClearSchedule} disabled={activities.length === 0} className={`w-full p-3 rounded-xl transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed border ${isDark ? 'bg-[#262626] hover:bg-red-600/20 text-gray-400 hover:text-red-500 border-[#333] hover:border-red-500/50' : 'bg-white hover:bg-red-50 text-gray-500 hover:text-red-600 border-gray-200 hover:border-red-200'}`}>Clear Schedule</button>
           <div className="flex gap-3">
             <button type="button" onClick={handleSaveSchedule} disabled={activities.length === 0} className={`flex-1 border p-3 rounded-xl text-xs font-bold transition-all uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white border-blue-500/20' : 'bg-white hover:bg-blue-600 text-blue-600 hover:text-white border-blue-200 hover:border-blue-600'}`}>Save</button>
             <button type="button" onClick={() => fileInputRef.current?.click()} className={`flex-1 border p-3 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${isDark ? 'bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white border-blue-500/20' : 'bg-white hover:bg-blue-600 text-blue-600 hover:text-white border-blue-200 hover:border-blue-600'}`}>Load</button>
             <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => {
               const file = e.target.files?.[0];
               if (file) {
                 const reader = new FileReader();
                 reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target?.result as string);
                        if (Array.isArray(data)) setActivities(data);
                    } catch (err) {
                        console.error("Failed to parse loaded file", err);
                    }
                 };
                 reader.readAsText(file);
               }
             }} />
           </div>
        </div>
      </section>

      <section 
        onClick={handleTheaterClick}
        className={`flex-1 flex flex-col transition-all duration-700 ${isTheaterMode ? 'w-full h-full flex-[100%] scale-100 cursor-pointer rounded-none p-0 border-none shadow-none gap-0' : 'rounded-2xl p-6 border shadow-2xl flex-1 gap-4'} ${isDark ? 'bg-[#1e1e1e] border-[#333]' : 'bg-white border-gray-200'}`}
      >
        {isTheaterMode && (
          <div className={`absolute top-6 left-6 z-50 flex items-center gap-2 group transition-opacity duration-300 ${showTheaterControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
             <button onClick={(e) => { e.stopPropagation(); toggleTheaterMode(); }} className={`p-3 rounded-full shadow-2xl transition-all border ${isDark ? 'bg-black/80 border-white/20 text-white hover:bg-orange-600' : 'bg-white/80 border-gray-200 text-gray-900 hover:bg-orange-600 hover:text-white'}`}>
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
             </button>
          </div>
        )}
        <CountdownDisplay 
          activity={currentIndex !== null ? activities[currentIndex] : null}
          nextActivity={(currentIndex !== null && currentIndex < activities.length - 1) ? activities[currentIndex+1] : null}
          remainingTime={remainingTime}
          timerState={timerState}
          onStart={startTimer}
          onPause={pauseTimer}
          onReset={handleReset}
          onClear={handleClearTimer}
          onPrevious={handlePrevious}
          onNext={proceedToNext}
          onAdjustTime={handleAdjustTime}
          canStart={!!(currentIndex !== null || stagedIndex !== null)}
          theme={theme}
          isTheaterMode={isTheaterMode}
          isVoiceActive={isVoiceActive}
          onToggleVoice={() => setIsVoiceActive(!isVoiceActive)}
          onToggleTheaterMode={toggleTheaterMode}
        />

        {/* Hover Controls at the bottom for Theater Mode */}
        {isTheaterMode && (
          <div className={`absolute bottom-0 left-0 right-0 h-24 flex items-end justify-center pb-6 transition-opacity duration-300 z-50 group/controls ${showTheaterControls ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
            <div 
              onClick={(e) => e.stopPropagation()}
              className={`flex items-center gap-4 px-6 py-2 rounded-full border shadow-2xl backdrop-blur-md transition-all duration-500 transform translate-y-4 group-hover/controls:translate-y-0 max-w-[95vw] overflow-x-auto no-scrollbar ${showTheaterControls ? 'translate-y-0' : ''} ${isDark ? 'bg-black/60 border-white/10' : 'bg-white/60 border-gray-200'}`}
            >
              <button 
                onClick={() => timerState === TimerState.RUNNING ? pauseTimer() : startTimer()}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-colors ${isDark ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-black hover:bg-black/5'}`}
              >
                {timerState === TimerState.RUNNING ? 'Pause' : 'Play'}
              </button>
              <div className={`w-[1px] h-4 ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div>
              <button 
                onClick={handlePrevious}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-colors ${isDark ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-black hover:bg-black/5'}`}
              >
                Previous Event
              </button>
              <button 
                onClick={proceedToNext}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-colors ${isDark ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-black hover:bg-black/5'}`}
              >
                Next Event
              </button>
              <div className={`w-[1px] h-4 ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div>
              <button 
                onClick={handleReset}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-colors ${isDark ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-black hover:bg-black/5'}`}
              >
                Reset
              </button>
              
              {/* Expandable Event Title */}
              <div className="group/title relative flex items-center gap-2">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingTitle || ''}
                      placeholder="Event Title..."
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateTitle();
                        if (e.key === 'Escape') {
                          setEditingTitle(null);
                          setIsEditingTitle(false);
                        }
                      }}
                      autoFocus
                      className={`w-[100px] sm:w-[200px] md:w-[300px] px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest outline-none transition-all ${isDark ? 'bg-white/10 border-white/20 text-white focus:border-orange-500' : 'bg-black/5 border-black/20 text-gray-900 focus:border-orange-500'}`}
                    />
                    <button 
                      onClick={handleUpdateTitle}
                      className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 ${isDark ? 'bg-orange-600 hover:bg-orange-500 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => {
                      if (currentIndex !== null) {
                        setEditingTitle(activities[currentIndex].name);
                        setIsEditingTitle(true);
                      }
                    }}
                    className={`max-w-[120px] group-hover:max-w-[400px] cursor-pointer transition-all duration-500 overflow-hidden whitespace-nowrap px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${isDark ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10' : 'bg-black/5 border-black/10 text-gray-700 hover:bg-black/10'}`}
                  >
                    {currentIndex !== null ? activities[currentIndex].name : 'No Active Event'}
                  </div>
                )}
              </div>

              <button 
                onClick={handleClearTimer}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-red-600 hover:text-red-700 hover:bg-red-500/5'}`}
              >
                Clear Live
              </button>
              <div className={`w-[1px] h-4 ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div>
              <button 
                onClick={() => handleAdjustTime(-60)}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${isDark ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-500/5'}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                1m
              </button>
              <button 
                onClick={() => handleAdjustTime(60)}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${isDark ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-500/5'}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                1m
              </button>
            </div>
          </div>
        )}
      </section>

      {/* QR Code Modal */}
      <QRCodeModal 
        isOpen={isQRCodeOpen} 
        onClose={() => setIsQRCodeOpen(false)} 
        isDark={isDark} 
        sessionId={sessionId}
      />

      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings} 
        onUpdate={onUpdateSettings} 
      />
    </div>
  );
};

export default TimerApp;
