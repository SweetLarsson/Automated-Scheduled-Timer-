
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, TimerState } from '../types';
import EventCreator from './EventCreator';
import ScheduleList from './ScheduleList';
import CountdownDisplay from './CountdownDisplay';

const TimerApp: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [stagedIndex, setStagedIndex] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [timerState, setTimerState] = useState<TimerState>(TimerState.IDLE);
  const [currentTime, setCurrentTime] = useState(new Date());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state to localStorage for Projection View
  useEffect(() => {
    const currentActivity = currentIndex !== null ? activities[currentIndex] : null;
    const nextActivity = (currentIndex !== null && currentIndex < activities.length - 1) 
      ? activities[currentIndex + 1] 
      : null;

    const data = {
      name: currentActivity ? currentActivity.name : "",
      nextName: nextActivity ? nextActivity.name : "",
      time: remainingTime,
      state: timerState,
      lastUpdate: Date.now()
    };
    
    localStorage.setItem('service_timer_sync', JSON.stringify(data));
  }, [remainingTime, timerState, currentIndex, activities]);

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const formatClock = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const formatSeconds = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return hrs > 0 
      ? `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddActivity = (name: string, seconds: number) => {
    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      durationSeconds: seconds
    };
    setActivities(prev => [...prev, newActivity]);
  };

  const handleClearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerState(TimerState.IDLE);
    setRemainingTime(0);
    setCurrentIndex(null);
  }, []);

  const handleClearSchedule = () => {
    if (activities.length === 0) return;
    handleClearTimer();
    setActivities([]);
    setStagedIndex(null);
  };

  const handleDeleteActivity = (id: string) => {
    const deletedIndex = activities.findIndex(a => a.id === id);
    if (deletedIndex === -1) return;
    const newActivities = activities.filter(a => a.id !== id);
    setActivities(newActivities);
    
    if (currentIndex === deletedIndex) {
      handleClearTimer();
    } else if (currentIndex !== null && deletedIndex < currentIndex) {
      setCurrentIndex(currentIndex - 1);
    }
    if (stagedIndex === deletedIndex) {
      setStagedIndex(null);
    } else if (stagedIndex !== null && deletedIndex < stagedIndex) {
      setStagedIndex(stagedIndex - 1);
    }
  };

  const selectActivity = (index: number) => {
    if (!activities[index]) return;
    setStagedIndex(index);
  };

  const handleGoLive = () => {
    if (stagedIndex === null) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCurrentIndex(stagedIndex);
    setRemainingTime(activities[stagedIndex].durationSeconds);
    setTimerState(TimerState.IDLE);
    setStagedIndex(null);
  };

  const startTimer = useCallback(() => {
    if (currentIndex === null && activities.length > 0) {
      const targetIndex = stagedIndex !== null ? stagedIndex : 0;
      setCurrentIndex(targetIndex);
      setRemainingTime(activities[targetIndex].durationSeconds);
      setStagedIndex(null);
    }
    setTimerState(TimerState.RUNNING);
  }, [currentIndex, activities, stagedIndex]);

  const pauseTimer = () => {
    if (timerState === TimerState.RUNNING || timerState === TimerState.TRANSITION) {
      setTimerState(TimerState.PAUSED);
    }
  };

  const handleReset = () => {
    if (currentIndex !== null && activities[currentIndex]) {
      setRemainingTime(activities[currentIndex].durationSeconds);
    } else {
      setRemainingTime(0);
    }
    setTimerState(TimerState.IDLE);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleSaveSchedule = () => {
    if (activities.length === 0) return;
    const blob = new Blob([JSON.stringify(activities, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Schedule_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadSchedule = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loaded = JSON.parse(event.target?.result as string);
        if (Array.isArray(loaded)) {
          handleClearTimer();
          setActivities(loaded);
          setStagedIndex(null);
        }
      } catch (err) {
        alert("Invalid schedule file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const launchProjector = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('projector', 'true');
      url.hash = 'projector';
      window.open(url.toString(), '_blank', 'width=1280,height=720,menubar=no,status=no,toolbar=no,resizable=yes');
    } catch (e) {
      // Fallback for weird environment URLs
      const href = window.location.href;
      const separator = href.includes('?') ? '&' : '?';
      window.open(href + separator + "projector=true#projector", '_blank', 'width=1280,height=720');
    }
  };

  const proceedToNext = useCallback(() => {
    setCurrentIndex(prevIndex => {
      if (prevIndex !== null && prevIndex < activities.length - 1) {
        const nextIndex = prevIndex + 1;
        setRemainingTime(activities[nextIndex].durationSeconds);
        setTimerState(TimerState.RUNNING);
        return nextIndex;
      }
      setTimerState(TimerState.IDLE);
      setRemainingTime(0);
      return null;
    });
  }, [activities]);

  const handleTimerEnd = useCallback(() => {
    if (currentIndex !== null && currentIndex < activities.length - 1) {
      setTimerState(TimerState.TRANSITION);
      setRemainingTime(5);
    } else {
      setTimerState(TimerState.IDLE);
      setRemainingTime(0);
      setCurrentIndex(null);
    }
  }, [currentIndex, activities]);

  useEffect(() => {
    if (timerState === TimerState.RUNNING || timerState === TimerState.TRANSITION) {
      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            if (timerState === TimerState.TRANSITION) {
              proceedToNext();
            } else {
              handleTimerEnd();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerState, handleTimerEnd, proceedToNext]);

  const stagedActivity = stagedIndex !== null ? activities[stagedIndex] : null;

  return (
    <div className="flex flex-col xl:flex-row w-full h-full xl:h-screen gap-4 p-4 box-border overflow-y-auto xl:overflow-hidden bg-[#121212] items-stretch">
      <section className="flex-1 flex flex-col gap-4 bg-[#1e1e1e] rounded-2xl p-6 border border-[#333] shadow-2xl min-h-[500px] xl:h-full overflow-hidden">
        <h2 className="bg-[#262626] border border-[#333] p-4 rounded-xl text-center font-bold text-sm uppercase tracking-widest text-gray-400">Load Event</h2>
        <div className="flex-1 overflow-hidden">
           <EventCreator onAdd={handleAddActivity} />
        </div>
      </section>

      <section className="flex-1 flex flex-col gap-4 bg-[#1e1e1e] rounded-2xl p-6 border border-[#333] shadow-2xl min-h-[500px] xl:h-full overflow-hidden">
        <div className="flex flex-col flex-1 border border-[#333] rounded-2xl p-4 bg-[#181818] overflow-hidden">
          <h2 className="bg-[#262626] border border-[#333] p-4 rounded-xl text-center font-bold text-sm uppercase tracking-widest text-gray-400 mb-4 flex justify-between items-center px-6">
            Schedule 
            <span className="text-orange-500 font-mono text-xl">{formatClock(currentTime)}</span>
          </h2>
          
          <ScheduleList 
            activities={activities} 
            currentIndex={currentIndex} 
            stagedIndex={stagedIndex}
            remainingTime={remainingTime}
            timerState={timerState}
            onSelect={selectActivity} 
            onDelete={handleDeleteActivity}
            onReorder={setActivities}
          />

          <div className={`mt-4 p-4 rounded-xl border transition-all duration-300 flex flex-col gap-3 shadow-lg ${stagedActivity ? 'bg-purple-600/10 border-purple-500/50' : 'bg-[#1a1a1a] border-[#333]'}`}>
            <div className="flex justify-between items-center px-1">
              <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${stagedActivity ? 'text-purple-400' : 'text-gray-600'}`}>Staging Area</span>
              {stagedActivity && (
                <button onClick={() => setStagedIndex(null)} className="text-[10px] text-gray-500 hover:text-white uppercase font-bold tracking-widest transition-colors">Clear</button>
              )}
            </div>
            {stagedActivity ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col overflow-hidden">
                  <span className="text-white font-bold text-sm truncate uppercase tracking-tight">{stagedActivity.name}</span>
                  <span className="text-purple-400 font-mono text-xs">{formatSeconds(stagedActivity.durationSeconds)}</span>
                </div>
                <button 
                  onClick={handleGoLive}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg active:scale-95 border-b-4 border-purple-800"
                >
                  Take Live
                </button>
              </div>
            ) : (
              <div className="py-2 text-center">
                 <span className="text-gray-700 text-[11px] font-medium italic">Select an item to stage</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
           <button 
             type="button"
             onClick={handleClearSchedule} 
             disabled={activities.length === 0}
             className="w-full bg-[#262626] hover:bg-red-600/20 text-gray-400 hover:text-red-500 border border-[#333] hover:border-red-500/50 p-3 rounded-xl transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
           >
             Clear Schedule
           </button>
           <div className="flex gap-3">
             <button type="button" onClick={handleSaveSchedule} disabled={activities.length === 0} className="flex-1 bg-orange-600/10 hover:bg-orange-600 text-orange-500 hover:text-white border border-orange-500/20 p-3 rounded-xl text-xs font-bold transition-all uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed">Save</button>
             <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white border border-blue-500/20 p-3 rounded-xl text-xs font-bold transition-all uppercase tracking-widest">Load</button>
             <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleLoadSchedule} />
           </div>
        </div>
      </section>

      <section className="flex-1 flex flex-col gap-4 bg-[#1e1e1e] rounded-2xl p-6 border border-[#333] shadow-2xl min-h-[500px] xl:h-full overflow-hidden">
        <CountdownDisplay 
          activity={currentIndex !== null ? activities[currentIndex] : null}
          nextActivity={(currentIndex !== null && currentIndex < activities.length - 1) ? activities[currentIndex+1] : null}
          remainingTime={remainingTime}
          timerState={timerState}
          onStart={startTimer}
          onPause={pauseTimer}
          onReset={handleReset}
          onClear={handleClearTimer}
          onLaunchProjector={launchProjector}
          canStart={!!(currentIndex !== null || stagedIndex !== null)}
        />
      </section>
    </div>
  );
};

export default TimerApp;
