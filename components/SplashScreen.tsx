
import React from 'react';
import { Theme } from '../types';

interface Props {
  theme?: Theme;
}

const SplashScreen: React.FC<Props> = ({ theme = 'dark' }) => {
  const isDark = theme === 'dark';

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 transition-all duration-1000 ${isDark ? 'bg-[#121212]' : 'bg-gray-100'}`}>
      <div className="flex flex-col items-center animate-fade-up text-center">
        {/* Animated Logo */}
        <div className={`w-20 h-20 sm:w-28 sm:h-28 mb-6 sm:mb-8 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_50px_rgba(249,115,22,0.3)] transition-all duration-700 transform hover:scale-105 ${isDark ? 'bg-gradient-to-br from-orange-500 to-orange-700' : 'bg-gradient-to-br from-orange-600 to-orange-800'}`}>
          <svg className="w-10 h-10 sm:w-14 sm:h-14 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h1 className={`text-3xl sm:text-5xl bebas-font tracking-[0.2em] mb-2 transition-colors duration-500 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          DYNAMIC SERVICE
        </h1>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`h-[1px] w-8 sm:w-12 ${isDark ? 'bg-orange-500/30' : 'bg-orange-600/30'}`}></div>
          <p className="text-orange-500 font-bold text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em]">Precise Event Timing</p>
          <div className={`h-[1px] w-8 sm:w-12 ${isDark ? 'bg-orange-500/30' : 'bg-orange-600/30'}`}></div>
        </div>
      </div>
      
      <div className="absolute bottom-12 sm:bottom-20 flex flex-col items-center gap-4">
        <div className={`w-40 sm:w-48 h-1 overflow-hidden rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
          <div className="h-full bg-orange-500 animate-loading-bar rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
        </div>
        <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Initialising Workspace</span>
      </div>

      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loading-bar {
          from { width: 0%; transform: translateX(-100%); }
          to { width: 100%; transform: translateX(0); }
        }
        .animate-fade-up {
          animation: fade-up 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .animate-loading-bar {
          animation: loading-bar 3s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
