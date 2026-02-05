
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
  const [customEvents, setCustomEvents] = useState<string[]>(() => {
    const saved = localStorage.getItem('custom_service_events');
    return saved ? JSON.parse(saved) : [];
  });

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

  const saveToCustom = () => {
    const name = eventName.trim();
    if (!name) return;
    if (customEvents.includes(name) || SUGGESTED_EVENTS.includes(name)) return;
    const newList = [name, ...customEvents];
    setCustomEvents(newList);
    localStorage.setItem('custom_service_events', JSON.stringify(newList));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      <div className="border border-[#444] rounded-xl p-4 flex flex-col gap-4 bg-[#262626]">
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Event Title"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-[#1a1a1a] border border-[#444] p-3 rounded-md text-white focus:outline-none focus:border-orange-500 transition-colors font-medium text-sm"
          />
          <button 
            onClick={saveToCustom}
            title="Add to suggested list"
            className="bg-[#333] hover:bg-orange-600 text-white p-3 rounded-md transition-colors border border-[#444]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
        
        <div className="flex gap-2 justify-between w-full py-2">
          <TimeWheel label="HH" max={23} value={hh} onChange={setHh} />
          <TimeWheel label="MM" max={59} value={mm} onChange={setMm} />
          <TimeWheel label="SS" max={59} value={ss} onChange={setSs} />
        </div>

        <button 
          onClick={handleSubmit}
          className="bg-orange-600 hover:bg-orange-700 p-3 rounded-md font-bold transition-all transform active:scale-95 w-full shadow-lg text-sm"
        >
          Add Activity
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar border border-[#444] rounded-xl p-3 bg-[#262626]">
        <div className="flex flex-wrap gap-2">
          {[...customEvents, ...SUGGESTED_EVENTS].map((evt, i) => (
            <button 
              key={`${evt}-${i}`}
              onClick={() => setEventName(evt)}
              className={`bg-[#333] hover:bg-[#444] px-3 py-2 rounded-full text-[11px] font-medium border border-[#fff1] transition-all
                ${i % 3 === 0 ? 'flex-grow-[1.2]' : i % 2 === 0 ? 'flex-grow' : 'flex-grow-[0.8]'}
              `}
            >
              {evt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const TimeWheel: React.FC<{ label: string; max: number; value: number; onChange: (v: number) => void }> = ({ label, max, value, onChange }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  // Reduced wheel height as requested
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
          // Tightened opacity/scale for the shorter 50px window
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
