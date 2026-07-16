
import React, { useState, useRef, useEffect } from 'react';
import { SUGGESTED_EVENTS } from '../constants';
import { Theme } from '../types';

interface Props {
  onAdd: (name: string, seconds: number) => void;
  theme?: Theme;
  isVoiceActive?: boolean;
  onToggleVoice?: () => void;
}

const EventCreator: React.FC<Props> = ({ onAdd, theme = 'dark', isVoiceActive = false, onToggleVoice }) => {
  const [eventName, setEventName] = useState('');
  const [hh, setHh] = useState(0);
  const [mm, setMm] = useState(0);
  const [ss, setSs] = useState(0);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const isDark = theme === 'dark';

  const [managedEvents, setManagedEvents] = useState<string[]>(() => {
    const saved = localStorage.getItem('managed_service_events');
    if (saved) return JSON.parse(saved);
    return Array.from(new Set([...SUGGESTED_EVENTS]));
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
    // Reset state after adding
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

  const removeSuggestion = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setManagedEvents(managedEvents.filter(evt => evt !== name));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

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

  const filteredEvents = managedEvents.filter(evt => 
    evt.toLowerCase().includes(eventName.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      <div className={`border rounded-xl p-4 flex flex-col gap-4 transition-colors duration-500 ${isDark ? 'bg-[#262626] border-[#444]' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Search or Enter Event Title"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`w-full border p-3 pr-4 rounded-md focus:outline-none transition-all font-medium text-sm ${isDark ? 'bg-[#1a1a1a] border-[#444] text-white focus:border-orange-500' : 'bg-white border-gray-300 text-gray-900 focus:border-orange-600'}`}
            />
            {eventName && !managedEvents.includes(eventName) && (
              <button 
                onClick={saveToSuggestions}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-orange-600/20 text-orange-500 px-2 py-1 rounded border border-orange-500/30 hover:bg-orange-600 hover:text-white transition-colors uppercase font-bold"
              >
                Save
              </button>
            )}
          </div>
          <button 
            onClick={() => setIsReorderMode(!isReorderMode)}
            className={`p-3 rounded-md transition-all border ${isReorderMode ? 'bg-orange-600 text-white' : (isDark ? 'bg-[#333] border-[#444] text-gray-400' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-100')}`}
            title="Manage Suggestions"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>
        
        <div className="flex gap-2 justify-between w-full py-2">
          <TimeWheel label="HH" max={23} value={hh} onChange={setHh} isDark={isDark} />
          <TimeWheel label="MM" max={59} value={mm} onChange={setMm} isDark={isDark} />
          <TimeWheel label="SS" max={59} value={ss} onChange={setSs} isDark={isDark} />
        </div>

        <button 
          onClick={handleSubmit}
          className={`p-3 rounded-md font-bold transition-all transform active:scale-95 w-full shadow-lg text-sm uppercase tracking-widest text-white ${isDark ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-600 hover:bg-orange-700'}`}
        >
          Add to Schedule
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto no-scrollbar border rounded-xl p-3 transition-colors duration-500 ${isDark ? 'bg-[#262626] border-[#444]' : 'bg-white border-gray-200 shadow-inner'}`}>
        <div className="flex flex-col gap-2 mb-2 px-1">
           <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
             {isReorderMode ? "Reorder or Delete suggestions" : "Quick Suggestions"}
           </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(isReorderMode ? managedEvents : filteredEvents).map((evt, i) => (
            <div 
              key={`${evt}-${i}`}
              draggable={isReorderMode}
              onDragStart={(e) => isReorderMode && onDragStart(e, i)}
              onDragOver={(e) => isReorderMode && onDragOver(e, i)}
              onDragEnd={() => isReorderMode && onDragEnd()}
              onClick={() => !isReorderMode && setEventName(evt)}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium border transition-all select-none
                ${isReorderMode 
                  ? (isDark ? 'bg-orange-600/10 border-orange-500/50 cursor-move' : 'bg-orange-50 border-orange-200 cursor-move') 
                  : (isDark ? 'bg-[#333] hover:bg-[#444] border-[#fff1] cursor-pointer' : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700 cursor-pointer')
                }
                ${draggedItemIndex === i ? 'opacity-20' : 'opacity-100'}
              `}
            >
              {isReorderMode && <span className="opacity-50">⠿</span>}
              {evt}
              {isReorderMode && (
                <button 
                  onClick={(e) => removeSuggestion(e, evt)}
                  className={`ml-1 p-0.5 rounded-full hover:bg-red-500 hover:text-white transition-colors ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TimeWheel: React.FC<{ label: string; max: number; value: number; onChange: (v: number) => void; isDark: boolean }> = ({ label, max, value, onChange, isDark }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);
  const ITEM_HEIGHT = 40;

  useEffect(() => {
    if (isUpdatingRef.current) return;
    if (scrollRef.current) {
        scrollRef.current.scrollTop = value * ITEM_HEIGHT;
    }
  }, [value]);

  const handleScroll = () => {
    if (!scrollRef.current || isUpdatingRef.current) return;
    const index = Math.round(scrollRef.current.scrollTop / ITEM_HEIGHT);
    if (index >= 0 && index <= max && index !== value) {
      onChange(index);
    }
  };

  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <div className={`border rounded-t-md p-1 w-full text-center text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${isDark ? 'bg-[#1a1a1a] border-[#444] text-gray-500' : 'bg-gray-200 border-gray-300 text-gray-600'}`}>{label}</div>
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ height: `50px` }}
        className={`wheel-mask w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar border-x transition-colors duration-500 ${isDark ? 'bg-[#111] border-[#444]' : 'bg-gray-100 border-gray-300'}`}
      >
        <div style={{ height: `5px` }} />
        {Array.from({ length: max + 1 }).map((_, i) => (
          <div 
            key={i} 
            className={`flex items-center justify-center snap-center h-[40px] text-lg transition-all duration-150 ${i === value ? 'text-orange-500 font-black scale-110' : (isDark ? 'text-gray-600' : 'text-gray-400')}`}
          >
            {i.toString().padStart(2, '0')}
          </div>
        ))}
        <div style={{ height: `5px` }} />
      </div>
      <div className={`border rounded-b-md p-1 w-full flex items-center justify-center transition-colors duration-500 ${isDark ? 'bg-[#1a1a1a] border-[#444]' : 'bg-gray-200 border-gray-300'}`}>
        <input 
          type="number" 
          value={value.toString().padStart(2, '0')} 
          onChange={(e) => {
            const val = Math.max(0, Math.min(max, parseInt(e.target.value) || 0));
            onChange(val);
          }} 
          className={`w-full bg-transparent text-center text-xs font-bold focus:outline-none focus:text-orange-500 ${isDark ? 'text-white' : 'text-gray-900'}`} 
        />
      </div>
    </div>
  );
};

export default EventCreator;
