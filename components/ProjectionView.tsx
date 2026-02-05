
import React, { useState, useEffect, useRef } from 'react';
import { TimerState } from '../types';

const ProjectionView: React.FC = () => {
  const [syncData, setSyncData] = useState({
    name: "Ready",
    time: 0,
    state: TimerState.IDLE
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('service-timer-sync');
    channel.onmessage = (event) => {
      if (event.data && typeof event.data === 'object' && 'time' in event.data) {
        setSyncData(event.data);
      }
    };

    // Request the current state immediately from any active controller windows
    channel.postMessage('REQUEST_STATE');

    return () => channel.close();
  }, []);

  const formatTime = (time: number) => {
    const hrs = Math.floor(time / 3600);
    const mins = Math.floor((time % 3600) / 60);
    const secs = time % 60;
    return hrs > 0
      ? `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      : `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const isCritical = syncData.time <= 10 && syncData.time > 0;
  const isFinished = syncData.time === 0 && syncData.state !== TimerState.IDLE;

  return (
    <div 
      ref={containerRef}
      className="w-screen h-screen bg-black flex flex-col items-center justify-center overflow-hidden cursor-pointer"
      onClick={toggleFullscreen}
    >
      {!isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center cursor-pointer">
          <div className="text-center">
            <p className="text-orange-500 text-3xl font-bold mb-4">PROJECTION MODE ACTIVE</p>
            <p className="text-white text-xl animate-pulse">CLICK ANYWHERE TO ENTER FULLSCREEN</p>
          </div>
        </div>
      )}

      <div className="w-full h-full max-w-[177.78vh] max-h-[56.25vw] aspect-video flex flex-col items-center justify-center p-10 relative">
        {/* Cinematic Background Glow */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full blur-[150px] transition-colors duration-1000 ${isCritical ? 'bg-red-600' : 'bg-orange-600'}`}></div>
        </div>

        <h2 className="text-4xl md:text-6xl font-bold mb-12 text-center text-orange-500 tracking-[0.2em] uppercase drop-shadow-[0_0_20px_rgba(249,115,22,0.5)] z-10">
          {syncData.name}
        </h2>

        <div className="relative flex items-center justify-center w-full z-10">
          <h1 className={`bebas-font tracking-tighter leading-none select-none transition-all duration-300 drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]
            ${isFinished ? 'text-red-600 text-[12vw]' : 
              isCritical ? 'text-red-50 text-[35vw] animate-pulse' : 
              'text-white text-[32vw]'
            }`}
          >
            {isFinished ? "TIME'S UP!" : formatTime(syncData.time)}
          </h1>
        </div>

        {syncData.state === TimerState.PAUSED && (
          <div className="absolute bottom-10 right-10 flex items-center gap-4 bg-orange-600/20 px-6 py-2 rounded-full border border-orange-500/50 z-20">
            <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></div>
            <span className="text-orange-500 font-bold tracking-widest text-sm uppercase">Paused</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectionView;
