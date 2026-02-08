
import React, { useState } from 'react';
import { Activity, TimerState } from '../types';

interface Props {
  activities: Activity[];
  currentIndex: number | null;
  stagedIndex: number | null;
  remainingTime: number; 
  timerState: TimerState;
  onSelect: (index: number) => void;
  onDelete: (id: string) => void;
  onReorder: (activities: Activity[]) => void;
}

const ScheduleList: React.FC<Props> = ({ activities, currentIndex, stagedIndex, remainingTime, timerState, onSelect, onDelete, onReorder }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const formatSeconds = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return hrs > 0 
      ? `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null) return;
    const newActivities = [...activities];
    const item = newActivities.splice(draggedIndex, 1)[0];
    newActivities.splice(index, 0, item);
    onReorder(newActivities);
    setDraggedIndex(null);
  };

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar">
      <ul className="flex flex-col gap-2">
        {activities.map((activity, index) => {
          const isSelected = currentIndex === index;
          const isStaged = stagedIndex === index;
          const isTransitioning = isSelected && timerState === TimerState.TRANSITION;
          
          return (
            <li 
              key={activity.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onClick={() => onSelect(index)}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing group shadow-md
                ${isSelected 
                  ? (isTransitioning ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500/50' : 'bg-orange-600/10 border-orange-500 ring-1 ring-orange-500/50')
                  : isStaged
                    ? 'bg-purple-600/10 border-purple-500 border-dashed ring-1 ring-purple-500/30'
                    : 'bg-[#1a1a1a] border-[#333] hover:border-[#444] hover:bg-[#222]'
                } ${draggedIndex === index ? 'opacity-30' : 'opacity-100'}
              `}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex flex-col overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-[13px] truncate ${isSelected ? (isTransitioning ? 'text-blue-400' : 'text-orange-500') : isStaged ? 'text-purple-400' : 'text-gray-200'}`}>
                      {index + 1}. {activity.name}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] bg-orange-600 text-white px-1.5 py-0.5 rounded font-black tracking-tighter uppercase">Live</span>
                    )}
                    {isStaged && !isSelected && (
                      <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-black tracking-tighter uppercase">Staged</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-mono text-gray-500 bg-black/30 px-2 py-0.5 rounded-md">
                      {formatSeconds(activity.durationSeconds)}
                    </span>
                    {isSelected && (
                      <span className={`text-[11px] font-black animate-pulse whitespace-nowrap ${isTransitioning ? 'text-blue-400' : 'text-orange-500'}`}>
                        • {isTransitioning ? `Transitioning: ${remainingTime}s` : formatSeconds(remainingTime)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(activity.id);
                }}
                className={`bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-2 rounded-lg text-xs transition-all border border-red-500/20 flex-shrink-0 opacity-0 group-hover:opacity-100`}
                title="Remove Item"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </li>
          );
        })}
      </ul>
      {activities.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-gray-600 italic gap-2 py-10">
          <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-sm font-medium">Your schedule is empty</span>
        </div>
      )}
    </div>
  );
};

export default ScheduleList;
