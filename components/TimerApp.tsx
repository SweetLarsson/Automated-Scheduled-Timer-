
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, TimerState } from '../types';
import EventCreator from './EventCreator';
import ScheduleList from './ScheduleList';
import CountdownDisplay from './CountdownDisplay';

const TimerApp: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [timerState, setTimerState] = useState<TimerState>(TimerState.IDLE);
  const [currentTime, setCurrentTime] = useState(new Date());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  
  const latestSyncData = useRef({
    name: "Ready",
    time: 0,
    state: TimerState.IDLE
  });

  useEffect(() => {
    const channel = new BroadcastChannel('service-timer-sync');
    channelRef.current = channel;
    channel.onmessage = (event) => {
      if (event.data === 'REQUEST_STATE') {
        channel.postMessage(latestSyncData.current);
      }
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    const currentActivity = currentIndex !== null ? activities[currentIndex] : null;
    const data = {
      name: currentActivity ? currentActivity.name : "Ready",
      time: remainingTime,
      state: timerState
    };
    latestSyncData.current = data;
    channelRef.current?.postMessage(data);
  }, [remainingTime, timerState, currentIndex, activities]);

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    let wakeLockObj: any = null;
    const requestLock = async () => {
      if ('wakeLock' in navigator && (navigator as any).wakeLock) {
        try {
          wakeLockObj = await (navigator as any).wakeLock.request('screen');
        } catch (err: any) {
          if (err.name === 'NotAllowedError' || err.message.includes('permissions policy')) {
            console.warn('Wake Lock is blocked by browser policy/sandbox.');
          }
        }
      }
    };
    requestLock();
    return () => {
      if (wakeLockObj && wakeLockObj.release) {
        wakeLockObj.release().catch(() => {});
      }
    };
  }, []);

  const formatClock = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
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
  };

  const selectActivity = (index: number) => {
    if (!activities[index]) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCurrentIndex(index);
    setRemainingTime(activities[index].durationSeconds);
    setTimerState(TimerState.IDLE);
  };

  const startTimer = useCallback(() => {
    if (currentIndex === null && activities.length > 0) {
      selectActivity(0);
    }
    setTimerState(TimerState.RUNNING);
  }, [currentIndex, activities]);

  const pauseTimer = () => {
    setTimerState(TimerState.PAUSED);
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
        }
      } catch (err) {
        alert("Invalid schedule file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const launchProjector = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('projector', 'true');
    window.open(url.toString(), 'ProjectorWindow', 'width=1280,height=720,menubar=no,status=no,toolbar=no');
  };

  const moveToNext = useCallback(() => {
    setActivities(currentActivities => {
      setCurrentIndex(prevIndex => {
        if (prevIndex !== null && prevIndex < currentActivities.length - 1) {
          const nextIndex = prevIndex + 1;
          const nextActivity = currentActivities[nextIndex];
          setRemainingTime(nextActivity.durationSeconds);
          return nextIndex;
        } else {
          setTimerState(TimerState.IDLE);
          setRemainingTime(0);
          return null;
        }
      });
      return currentActivities;
    });
  }, []);

  useEffect(() => {
    if (timerState === TimerState.RUNNING) {
      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            moveToNext();
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
  }, [timerState, moveToNext]);

  return (
    <div className="flex flex-col xl:flex-row w-full h-full xl:h-screen gap-4 p-4 box-border overflow-y-auto xl:overflow-hidden bg-[#121212] items-stretch">
      <section className="flex-1 flex flex-col gap-4 bg-[#1e1e1e] rounded-2xl p-6 border border-[#333] shadow-2xl min-h-[500px] xl:h-full overflow-hidden">
        <h2 className="bg-[#262626] border border-[#333] p-4 rounded-xl text-center font-bold text-sm uppercase tracking-widest text-gray-400">Load Event</h2>
        <div className="flex-1 overflow-hidden">
           <EventCreator onAdd={handleAddActivity} />
        </div>
      </section>

      <section className="flex-1 flex flex-col gap-4 bg-[#1e1e1e] rounded-2xl p-6 border border-[#333] shadow-2xl min-h-[500px] xl:h-full overflow-hidden">
        <div className="flex flex-col h-[75%] xl:h-[82%] border border-[#333] rounded-2xl p-4 bg-[#181818] overflow-hidden">
          <h2 className="bg-[#262626] border border-[#333] p-4 rounded-xl text-center font-bold text-sm uppercase tracking-widest text-gray-400 mb-4 flex justify-between items-center px-6">
            Schedule 
            <span className="text-orange-500 font-mono text-xl">{formatClock(currentTime)}</span>
          </h2>
          <ScheduleList 
            activities={activities} 
            currentIndex={currentIndex} 
            remainingTime={remainingTime}
            onSelect={selectActivity} 
            onDelete={handleDeleteActivity}
            onReorder={setActivities}
          />
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
          remainingTime={remainingTime}
          timerState={timerState}
          onStart={startTimer}
          onPause={pauseTimer}
          onReset={handleReset}
          onClear={handleClearTimer}
          onLaunchProjector={launchProjector}
        />
      </section>
    </div>
  );
};

export default TimerApp;
