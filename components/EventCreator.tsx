
import React, { useState, useRef, useEffect } from 'react';
import { SUGGESTED_EVENTS } from '../constants';

interface Props {
  onAdd: (name: string, seconds: number) => void;
}

const EventCreator: React.FC<Props> = ({ onAdd }) => {
  const [eventName, setEventName] = useState('');
  const [hh, setHh] = useState(0);
  const [mm, setMm] = useState(0);
  const [ss, setSs] = useState(0);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const [managedEvents, setManagedEvents] = useState<string[]>(() => {
    const saved = localStorage.getItem('managed_service_events');
    if (saved) return JSON.parse(saved);
    // Combine defaults and any old custom events on first run
    const oldCustom = localStorage.getItem('custom_service_events');
    const custom = oldCustom ? JSON.parse(oldCustom) : [];
    return Array.from(new Set([...custom, ...SUGGESTED_EVENTS]));
  });

  useEffect(() => {
    localStorage.setItem('managed_service_events', JSON.stringify(managedEvents));
  }, [managedEvents]);

  const handleSubmit = () => {
    const total = (hh * 3600) + (mm * 60) + ss;
    if (total <= 0) {
      alert("Minimum event time is 1 sec");
      return;
    }
    if (!eventName.trim()) {
      alert("Please enter an event name.");
      return;
    }
    onAdd(eventName, total);
    setEventName('');
    setHh(0);
    setMm(0);
    setSs(0);
  };

  const saveToSuggestions = () => {
    const name = eventName.trim();
    if (!name) return;
    if (managedEvents.includes(name)) return;
    setManagedEvents([name, ...managedEvents]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const filteredEvents = managedEvents.filter(evt => 
    evt.toLowerCase().includes(eventName.toLowerCase())
  );

  // Drag and Drop Logic for Reordering
  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    
    const newList = [...managedEvents];
    const item = newList.splice(draggedItemIndex, 1)[0];
    newList.splice(index, 0, item);
    
    setDraggedItemIndex(index);
    setManagedEvents(newList);
  };

  const onDragEnd = () => {
    setDraggedItemIndex(null);
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      <div className="border border-[#444] rounded-xl p-4 flex flex-col gap-4 bg-[#262626]">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Search or Enter Event Title"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-[#1a1a1a] border border-[#444] p-3 rounded-md text-white focus:outline-none focus:border-orange-500 transition-colors font-medium text-sm"
            />
            {eventName && !managedEvents.includes(eventName) && (
              <button 
                onClick={saveToSuggestions}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-orange-600/20 text-orange-500 px-2 py-1 rounded border border-orange-500/30 hover:bg-orange-600 hover:text-white transition-colors uppercase font-bold"
              >
                Save as Suggestion
              </button>
            )}
          </div>
          <button 
            onClick={() => setIsReorderMode(!isReorderMode)}
            title={isReorderMode ? "Finish Reordering" : "Reorder Suggestions"}
            className={`p-3 rounded-md transition-colors border border-[#444] ${isReorderMode ? 'bg-orange-600 text-white' : 'bg-[#333] hover:bg-orange-600 text-gray-400 hover:text-white'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
        
        <div className="flex gap-2 justify-between w-full py-2">
          <TimeWheel label="HH" max={23} value={hh} onChange={setHh} />
          <TimeWheel label="MM" max={59} value={mm} onChange={setMm} />
          <TimeWheel label="SS" max={59} value={ss} onChange={setSs} />
        </div>

        <button 
          onClick={handleSubmit}
          className="bg-orange-600 hover:bg-orange-700 p-3 rounded-md font-bold transition-all transform active:scale-95 w-full shadow-lg text-sm uppercase tracking-widest"
        >
          Add to Schedule
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar border border-[#444] rounded-xl p-3 bg-[#262626]">
        <div className="flex flex-col gap-2 mb-2 px-1">
           <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
             {isReorderMode ? "Drag to reorder items" : (eventName ? `Matches for "${eventName}"` : "Quick Suggestions")}
           </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(isReorderMode ? managedEvents : filteredEvents).map((evt, i) => (
            <button 
              key={`${evt}-${i}`}
              draggable={isReorderMode}
              onDragStart={(e) => isReorderMode && onDragStart(e, i)}
              onDragOver={(e) => isReorderMode && onDragOver(e, i)}
              onDragEnd={() => isReorderMode && onDragEnd()}
              onClick={() => !isReorderMode && setEventName(evt)}
              className={`px-3 py-2 rounded-lg text-[11px] font-medium border transition-all select-none
                ${isReorderMode 
                  ? 'bg-orange-600/10 border-orange-500/50 cursor-move border-dashed' 
                  : 'bg-[#333] hover:bg-[#444] border-[#fff1] cursor-pointer'
                }
                ${draggedItemIndex === i ? 'opacity-20' : 'opacity-100'}
              `}
            >
              {isReorderMode && <span className="mr-2 opacity-50">⠿</span>}
              {evt}
            </button>
          ))}
          {filteredEvents.length === 0 && !isReorderMode && (
            <div className="w-full py-6 text-center text-gray-600 text-[11px] italic">
              No matching suggestions found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TimeWheel: React.FC<{ label: string; max: number; value: number; onChange: (v: number) => void }> = ({ label, max, value, onChange }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  const ITEM_HEIGHT = 40;
  const WHEEL_HEIGHT = 50; 
  const PADDING_TOP = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

  useEffect(() => {
    if (isUpdatingRef.current) return;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = value * ITEM_HEIGHT;
    }
  }, [value]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const index = Math.round(scrollRef.current.scrollTop / ITEM_HEIGHT);
    if (index >= 0 && index <= max && index !== value) {
      isUpdatingRef.current = true;
      onChange(index);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 50);
    }
  };

  const handleManualEdit = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value) || 0;
    if (val > max) val = max;
    if (val < 0) val = 0;
    onChange(val);
  };

  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <div className="bg-[#1a1a1a] border border-[#444] rounded-t-md p-1 w-full text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</div>
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ height: `${WHEEL_HEIGHT}px` }}
        className="wheel-mask w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-[#111] border-x border-[#444] perspective-1000"
      >
        <div style={{ height: `${PADDING_TOP}px` }} />
        {Array.from({ length: max + 1 }).map((_, i) => {
          const distance = Math.abs(i - value);
          const opacity = Math.max(0.05, 1 - distance * 0.7);
          const scale = Math.max(0.7, 1 - distance * 0.2);
          const blur = distance > 0 ? `blur(${distance * 1}px)` : 'none';

          return (
            <div 
              key={i} 
              style={{ 
                opacity, 
                transform: `scale(${scale})`, 
                filter: blur, 
                height: `${ITEM_HEIGHT}px` 
              }}
              className={`flex items-center justify-center snap-center text-lg transition-all duration-150 ${i === value ? 'text-orange-500 font-black' : 'text-gray-600 font-medium'}`}
            >
              {i.toString().padStart(2, '0')}
            </div>
          );
        })}
        <div style={{ height: `${PADDING_TOP}px` }} />
      </div>
      <div className="w-full bg-[#1a1a1a] border border-[#444] rounded-b-md p-1 flex items-center justify-center">
        <input 
          type="number"
          value={value.toString().padStart(2, '0')}
          onChange={handleManualEdit}
          onBlur={(e) => {
             e.target.value = value.toString().padStart(2, '0');
          }}
          className="w-full bg-transparent text-center text-xs font-bold text-white focus:outline-none focus:text-orange-500"
        />
      </div>
    </div>
  );
};

export default EventCreator;
