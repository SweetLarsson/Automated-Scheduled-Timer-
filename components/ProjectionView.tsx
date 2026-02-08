
import React, { useState, useEffect, useRef } from 'react';
import { TimerState } from '../types';
import TimerDisplayVisual from './TimerDisplayVisual';

const ProjectionView: React.FC = () => {
  const [syncData, setSyncData] = useState({
    name: "",
    nextName: "",
    time: 0,
    state: TimerState.IDLE
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadFromStorage = () => {
      const stored = localStorage.getItem('service_timer_sync');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSyncData(parsed);
        } catch (e) {
          console.error("Failed to parse sync data", e);
        }
      }
    };

    loadFromStorage();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'service_timer_sync' && e.newValue) {
        try {
          setSyncData(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Failed to parse storage update", err);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    const poll = setInterval(loadFromStorage, 500);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(poll);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Fullscreen request rejected: ${err.message}`);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-screen h-screen bg-black flex flex-col items-center justify-center overflow-hidden cursor-pointer"
      onClick={toggleFullscreen}
      title="Click to toggle Fullscreen"
    >
      {/* Main Presentation Surface - Shows immediately */}
      <div className="w-full h-full">
        <TimerDisplayVisual 
          name={syncData.name} 
          nextName={syncData.nextName}
          time={syncData.time} 
          state={syncData.state} 
        />
      </div>
    </div>
  );
};

export default ProjectionView;
