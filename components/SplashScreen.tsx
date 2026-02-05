
import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1e1e1e] transition-opacity duration-1000">
      <div className="flex flex-col items-center animate-pulse">
        {/* Placeholder Logo */}
        <div className="w-24 h-24 mb-6 bg-orange-500 rounded-2xl flex items-center justify-center shadow-2xl">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-4xl bebas-font tracking-widest text-white">DYNAMIC SERVICE</h1>
        <p className="text-orange-500 font-medium mt-2 tracking-tighter">PRECISE EVENT TIMING</p>
      </div>
      <div className="absolute bottom-10">
        <div className="w-12 h-1 border-b-2 border-orange-500/30 animate-expand-width"></div>
      </div>
      <style>{`
        @keyframes expand-width {
          from { width: 0; }
          to { width: 100px; }
        }
        .animate-expand-width {
          animation: expand-width 3s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
