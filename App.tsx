
import React, { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import TimerApp from './components/TimerApp';
import ProjectionView from './components/ProjectionView';

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isProjector, setIsProjector] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasProjectorParam = params.get('projector') === 'true';
    const hasProjectorHash = window.location.hash === '#projector';

    if (hasProjectorParam || hasProjectorHash) {
      setIsProjector(true);
      setShowSplash(false);
    } else {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (isProjector) {
    return <ProjectionView />;
  }

  return (
    <div className="w-screen h-screen relative bg-[#1e1e1e] overflow-hidden">
      {showSplash ? <SplashScreen /> : <TimerApp />}
    </div>
  );
};

export default App;
