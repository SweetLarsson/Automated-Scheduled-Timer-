
import React, { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import TimerApp from './components/TimerApp';
import ProjectionView from './components/ProjectionView';
import RemoteView from './components/RemoteView';
import { Theme, AppSettings } from './types';

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isProjector, setIsProjector] = useState(false);
  const [isRemote, setIsRemote] = useState(false);
  
  // Initialize settings from localStorage or default
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('service_timer_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    
    const savedTheme = localStorage.getItem('service_timer_theme');
    const initialTheme = (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
    
    return {
      theme: initialTheme as Theme,
      enableBeeps: true,
      milestoneNotificationTime: 60,
      alertSound: 'beep',
      enableVoice: true,
      voiceGender: 'female'
    };
  });

  useEffect(() => {
    // Apply initial theme from state to the document root
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    localStorage.setItem('service_timer_theme', settings.theme);
    localStorage.setItem('service_timer_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const checkMode = () => {
      const hash = window.location.hash;
      const isProjectorMode = hash.includes('projector');
      const isRemoteMode = hash.includes('remote');

      if (isProjectorMode) {
        setIsProjector(true);
        setIsRemote(false);
        setShowSplash(false);
      } else if (isRemoteMode) {
        setIsRemote(true);
        setIsProjector(false);
        setShowSplash(false);
      } else {
        setIsProjector(false);
        setIsRemote(false);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          setShowSplash(false);
        }, 3000);
      }
    };

    checkMode();
    window.addEventListener('hashchange', checkMode);
    return () => {
      window.removeEventListener('hashchange', checkMode);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };

  if (isProjector) {
    return <ProjectionView />;
  }

  if (isRemote) {
    return <RemoteView />;
  }

  return (
    <div className={`w-screen h-screen relative overflow-hidden transition-colors duration-500 ${settings.theme === 'dark' ? 'bg-[#121212] text-white' : 'bg-[#f3f4f6] text-gray-900'}`}>
      {showSplash ? (
        <SplashScreen theme={settings.theme} />
      ) : (
        <TimerApp settings={settings} onUpdateSettings={updateSettings} />
      )}
    </div>
  );
};

export default App;
