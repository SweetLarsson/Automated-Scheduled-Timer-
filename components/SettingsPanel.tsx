
import React from 'react';
import { AppSettings, Theme, AlertSound } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
}

const SettingsPanel: React.FC<Props> = ({ isOpen, onClose, settings, onUpdate }) => {
  const isDark = settings.theme === 'dark';

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onUpdate({ ...settings, [key]: value });
  };

  const sounds: AlertSound[] = ['beep', 'whistle', 'chime', 'pulse', 'digital'];

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm sm:max-w-md rounded-[2rem] shadow-2xl border overflow-hidden transition-all duration-500 transform scale-100 ${isDark ? 'bg-[#1e1e1e] border-[#333] text-white' : 'bg-white border-gray-200 text-gray-900'}`}
      >
        <div className={`p-5 sm:p-6 border-b flex justify-between items-center ${isDark ? 'border-[#333]' : 'border-gray-100'}`}>
          <h2 className="text-base sm:text-lg font-black uppercase tracking-widest">Settings</h2>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 sm:p-6 flex flex-col gap-4 sm:gap-5 overflow-y-auto no-scrollbar max-h-[70vh] sm:max-h-[75vh]">
          {/* Display Settings */}
          <section className="flex flex-col gap-2">
            <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Display Settings</h3>
            <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 bg-opacity-50 ${isDark ? 'bg-black/20 border-[#333]' : 'bg-gray-50 border-gray-100'}`}>
              <span className="font-bold text-xs">Dark Mode</span>
              <button 
                onClick={() => updateSetting('theme', isDark ? 'light' : 'dark')}
                className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${isDark ? 'bg-orange-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300 ${isDark ? 'left-5.5' : 'left-0.5'}`} />
              </button>
            </div>
          </section>

          {/* Milestone Sound Settings */}
          <section className="flex flex-col gap-2">
            <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Milestone Sound Settings</h3>
            
            <div className="flex flex-col gap-2">
              <div className={`flex items-center justify-between p-3 rounded-2xl border bg-opacity-50 ${isDark ? 'bg-black/20 border-[#333]' : 'bg-gray-50 border-gray-100'}`}>
                <span className="font-bold text-xs">Milestone Beep Sound</span>
                <button 
                  onClick={() => updateSetting('enableBeeps', !settings.enableBeeps)}
                  className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${settings.enableBeeps ? 'bg-green-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300 ${settings.enableBeeps ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>

              <div className={`flex items-center justify-between p-3 rounded-2xl border bg-opacity-50 ${isDark ? 'bg-black/20 border-[#333]' : 'bg-gray-50 border-gray-100'}`}>
                <span className="font-bold text-xs">Notification Timer (s)</span>
                <input 
                  type="number"
                  value={settings.milestoneNotificationTime}
                  onChange={(e) => updateSetting('milestoneNotificationTime', parseInt(e.target.value) || 0)}
                  className={`w-16 p-1.5 rounded-xl text-center font-mono text-xs border ${isDark ? 'bg-black/40 border-[#444] text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-50 ml-1">Sound Type</span>
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {sounds.map(s => (
                    <button
                      key={s}
                      onClick={() => updateSetting('alertSound', s)}
                      className={`flex-1 min-w-[55px] p-2 rounded-xl border text-[8px] font-black uppercase tracking-tighter transition-all ${settings.alertSound === s ? 'border-orange-500 bg-orange-500/10 text-orange-500' : (isDark ? 'border-[#333] bg-black/20 text-gray-500' : 'border-gray-100 bg-gray-50 text-gray-400')}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Voice Readout Settings */}
          <section className="flex flex-col gap-2">
            <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Voice Readout Settings</h3>
            
            <div className="flex flex-col gap-2">
              <div className={`flex items-center justify-between p-3 rounded-2xl border bg-opacity-50 ${isDark ? 'bg-black/20 border-[#333]' : 'bg-gray-50 border-gray-100'}`}>
                <span className="font-bold text-xs">Voice Readout</span>
                <button 
                  onClick={() => updateSetting('enableVoice', !settings.enableVoice)}
                  className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${settings.enableVoice ? 'bg-green-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300 ${settings.enableVoice ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>

              {settings.enableVoice && (
                <div className={`flex items-center justify-between p-3 rounded-2xl border bg-opacity-50 ${isDark ? 'bg-black/20 border-[#333]' : 'bg-gray-50 border-gray-100'}`}>
                  <span className="font-bold text-xs">Voice Selection</span>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => updateSetting('voiceGender', 'female')}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${settings.voiceGender === 'female' ? 'bg-orange-600 text-white' : (isDark ? 'bg-[#333] text-gray-400' : 'bg-gray-200 text-gray-600')}`}
                    >
                      Female
                    </button>
                    <button 
                      onClick={() => updateSetting('voiceGender', 'male')}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${settings.voiceGender === 'male' ? 'bg-orange-600 text-white' : (isDark ? 'bg-[#333] text-gray-400' : 'bg-gray-200 text-gray-600')}`}
                    >
                      Male
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className={`p-6 border-t ${isDark ? 'border-[#333]' : 'border-gray-100'}`}>
          <button 
            onClick={onClose}
            className={`w-full p-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 border-b-4 text-sm ${isDark ? 'bg-orange-600 hover:bg-orange-700 text-white border-orange-800' : 'bg-orange-600 hover:bg-orange-700 text-white border-orange-900'}`}
          >
            Done
          </button>
        </div>
      </div>
      
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default SettingsPanel;
