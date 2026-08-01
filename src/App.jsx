import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Hero from './Hero';
import Onboarding from './Onboarding';
import ResumeBuilder from './ResumeBuilder';
import '@fontsource/geist-sans';
import './index.css';

function App() {
  const [currentView, setCurrentView] = useState('hero'); // 'hero', 'onboarding', 'resumeBuilder'
  const [initialStep, setInitialStep] = useState(0);
  const [savedOnlyMode, setSavedOnlyMode] = useState(false);
  const [appliedOnlyMode, setAppliedOnlyMode] = useState(false);

  const handleViewSaved = () => {
    setInitialStep(4);
    setSavedOnlyMode(true);
    setAppliedOnlyMode(false);
    setCurrentView('onboarding');
  };

  const handleViewApplied = () => {
    setInitialStep(4);
    setAppliedOnlyMode(true);
    setSavedOnlyMode(false);
    setCurrentView('onboarding');
  };

  const handleStart = () => {
    setInitialStep(0);
    setSavedOnlyMode(false);
    setAppliedOnlyMode(false);
    setCurrentView('onboarding');
  };

  const handleBuildResume = () => {
    setCurrentView('resumeBuilder');
  };

  const handleHome = () => {
    setCurrentView('hero');
    setSavedOnlyMode(false);
    setAppliedOnlyMode(false);
  };

  return (
    <div className="main-wrapper" style={{ overflowX: 'hidden' }}>
      <AnimatePresence mode="wait">
        {currentView === 'hero' && (
          <motion.div
            key="hero-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Hero onStart={handleStart} onViewSaved={handleViewSaved} onViewApplied={handleViewApplied} onBuildResume={handleBuildResume} />
          </motion.div>
        )}
        {currentView === 'onboarding' && (
          <motion.div
            key="onboarding-view"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30, transition: { duration: 0.2 } }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Onboarding 
              onHome={handleHome} 
              initialStep={initialStep}
              savedOnlyMode={savedOnlyMode}
              appliedOnlyMode={appliedOnlyMode}
            />
          </motion.div>
        )}
        {currentView === 'resumeBuilder' && (
          <motion.div
            key="resumebuilder-view"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30, transition: { duration: 0.2 } }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <ResumeBuilder onHome={handleHome} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
