import React, { useRef, useState } from 'react';
import { ArrowDown, Menu, X, Briefcase, FileText } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import './index.css';

const RevealText = ({ text }) => {
  const container = useRef(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start 0.85", "center center"]
  });

  const words = text.split(" ");
  return (
    <p ref={container} className="reveal-text">
      {words.map((word, i) => {
        const start = i / words.length;
        const end = start + (1 / words.length);
        const opacity = useTransform(scrollYProgress, [start, end], [0.15, 1]);
        return (
          <motion.span key={i} style={{ opacity, display: 'inline-block', marginRight: '0.25em', marginTop: '0.1em' }}>
            {word}
          </motion.span>
        )
      })}
    </p>
  );
};

const Hero = ({ onStart, onViewSaved, onViewApplied, onBuildResume }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="portfolio-hero">
      {/* Wavy background lines */}
      <div className="wavy-bg">
        <svg viewBox="0 0 1440 800" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <path d="M-100,200 Q200,100 500,200 T1100,200 T1700,200" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          <path d="M-100,350 Q300,450 600,350 T1200,350 T1800,350" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          <path d="M-100,500 Q250,400 550,500 T1150,500 T1750,500" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          <path d="M-100,650 Q350,750 650,650 T1250,650 T1850,650" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          <path d="M-100,150 Q150,200 450,150 T1050,150 T1650,150" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <path d="M-100,800 Q400,700 700,800 T1300,800 T1900,800" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        </svg>
      </div>
      
      {/* Top Nav */}
      <nav className="top-nav">
        <div className="nav-logo">HireNudge</div>
        <div className="nav-links">
          <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.5)'} onClick={() => document.getElementById('about').scrollIntoView({ behavior: 'smooth' })}>ABOUT</span>
          <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.5)'} onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>FEATURES</span>
          <span style={{ cursor: 'pointer', color: '#ffd700' }} onClick={onViewSaved}>SAVED</span>
          <span style={{ cursor: 'pointer', color: '#4ade80' }} onClick={onViewApplied}>APPLICATIONS</span>
        </div>
        <div style={{ zIndex: 100, cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseEnter={e=>e.currentTarget.style.opacity=0.7} onMouseLeave={e=>e.currentTarget.style.opacity=1} onClick={() => setMenuOpen(true)}>
          <Menu size={24} color="#fff" />
        </div>
      </nav>

      {/* Retractable Sidebar Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 999 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                height: '100vh',
                width: '350px',
                backgroundColor: '#0a0a0a',
                borderLeft: '1px solid rgba(255,255,255,0.05)',
                zIndex: 1000,
                padding: '2.5rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '0.1em' }}>MENU</span>
                <X size={20} color="rgba(255,255,255,0.5)" style={{ cursor: 'pointer' }} onClick={() => setMenuOpen(false)} onMouseEnter={e=>e.currentTarget.style.color='#fff'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.5)'} />
              </div>

              <div 
                onClick={() => { setMenuOpen(false); onStart(); }}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '1rem', borderRadius: '8px', transition: 'background 0.2s', border: '1px solid rgba(255,255,255,0.05)' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                  <Briefcase size={20} color="#fff" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 500, color: '#fff' }}>Find Jobs</span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Tell us what you're looking for</span>
                </div>
              </div>

              <div 
                onClick={() => { setMenuOpen(false); onBuildResume(); }}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '1rem', borderRadius: '8px', transition: 'background 0.2s', border: '1px solid rgba(255,255,255,0.05)' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                  <FileText size={20} color="#fff" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 500, color: '#fff' }}>Resume Builder</span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Upload & optimize your resume</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="main-content">
        <div className="title-wrapper">
          <h1 className="massive-title">
            <span className="text-light">100+ APPLICATIONS.</span><br />
            <motion.span 
              className="text-light"
              style={{ display: 'inline-block' }}
              animate={{ opacity: [0, 0, 1, 1, 0] }}
              transition={{ duration: 6, repeat: Infinity, times: [0, 0.1, 0.2, 0.9, 1] }}
            >
              0 REPLIES.
            </motion.span><br />
            <motion.span 
              className="text-heavy"
              style={{ display: 'inline-block' }}
              animate={{ opacity: [0, 0, 1, 1, 0] }}
              transition={{ duration: 6, repeat: Infinity, times: [0, 0.4, 0.5, 0.9, 1] }}
            >
              UNTIL NOW.
            </motion.span>
          </h1>
        </div>
      </div>

      {/* Footer */}
      <div className="hero-footer">
        <div className="scroll-indicator">
          SCROLL <ArrowDown size={14} />
        </div>
        <div className="slanted-line"></div>
        <div className="footer-action" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <div className="nav-badge" onClick={onStart} style={{ fontWeight: 'bold' }}>START APPLYING</div>
        </div>
      </div>
    </div>

    {/* Scroll-driven Story Section */}
    <div className="story-section">
      <RevealText text="you've probably applied to hundreds of job openings, only to be met with silence. it's time to level the playing field. automate the grind, perfect your resume match score, and let ai secure the interviews for you." />
    </div>

    {/* About Section */}
    <div id="about" className="info-section">
      <div className="info-container">
        <h2 className="info-title">About HireNudge</h2>
        <div className="info-grid">
          <p>HireNudge is an autonomous career agent designed to solve the modern job search crisis. While companies use AI to filter out candidates, we use AI to get you past the filters.</p>
          <p>By connecting to live job databases and analyzing your resume through powerful LLMs, we find the exact roles you are statistically most likely to land.</p>
        </div>
      </div>
    </div>

    {/* Features Section */}
    <div id="features" className="info-section">
      <div className="info-container">
        <h2 className="info-title">Core Features</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>Live Scraping</h3>
            <p>Access thousands of real-time job openings instantly.</p>
          </div>
          <div className="feature-card">
            <h3>AI Match Scoring</h3>
            <p>Know exactly how compatible you are before applying.</p>
          </div>
          <div className="feature-card">
            <h3>Application Tracking</h3>
            <p>Seamlessly save and track your applications in-browser.</p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Hero;
