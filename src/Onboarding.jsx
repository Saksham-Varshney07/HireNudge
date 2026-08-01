import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle2, Loader2, ArrowLeft, Home, ExternalLink, Target, Briefcase, FileUp, AlertTriangle, X, Star } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const SUGGESTIONS = [
  "Software Engineer", "Backend Engineer", "Full Stack Engineer", 
  "Python Engineer", "Java Engineer", "C/C++ Engineer", 
  "Frontend Engineer", "ML Engineer", "Product Manager",
  "DevOps Engineer", "Data Scientist", "UI/UX Designer"
];

const Onboarding = ({ onHome, initialStep = 0, savedOnlyMode = false, appliedOnlyMode = false }) => {
  const [step, setStep] = useState(initialStep);
  const [scanLines, setScanLines] = useState([]);
  const [apiKey, setApiKey] = useState('');
  
  const [targetRoles, setTargetRoles] = useState([]);
  const [roleInput, setRoleInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [targetLocations, setTargetLocations] = useState([]);
  const [locationInput, setLocationInput] = useState('');
  const [experience, setExperience] = useState('');
  const [internDurations, setInternDurations] = useState([]);
  const [resumeText, setResumeText] = useState('');
  const [fileName, setFileName] = useState('');
  const [jobs, setJobs] = useState(() => {
    const localData = localStorage.getItem('hirenudge_jobs');
    return localData ? JSON.parse(localData) : [];
  });
  const [starredJobs, setStarredJobs] = useState(() => {
    const localData = localStorage.getItem('hirenudge_starred_v2');
    return localData ? JSON.parse(localData) : [];
  });
  const [appliedJobs, setAppliedJobs] = useState(() => {
    const localData = localStorage.getItem('hirenudge_applied_v2');
    return localData ? JSON.parse(localData) : [];
  });
  const [showSavedOnly, setShowSavedOnly] = useState(savedOnlyMode);
  const [showAppliedOnly, setShowAppliedOnly] = useState(appliedOnlyMode);
  const [pendingApplyJob, setPendingApplyJob] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 15;

  const timerRef = useRef(null);
  const timeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('hirenudge_jobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem('hirenudge_starred_v2', JSON.stringify(starredJobs));
  }, [starredJobs]);

  useEffect(() => {
    localStorage.setItem('hirenudge_applied_v2', JSON.stringify(appliedJobs));
  }, [appliedJobs]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      try {
        setFileName(file.name);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + ' \n';
        }
        setResumeText(fullText);
      } catch (err) {
        alert("Failed to read PDF file.");
        setFileName('');
      }
    } else if (file) {
      alert("Please select a valid PDF file.");
    }
    e.target.value = null;
  };

  const handleProcessSubmit = async () => {
    if (!apiKey) {
      alert("Please provide an API Key (Groq, Gemini, or OpenRouter) at the top right.");
      return;
    }
    if (!resumeText) {
      alert("Please upload your PDF resume first.");
      return;
    }

    setStep(3);
    setScanLines(["Setting up your profile..."]);
    
    const progressLines = [
      "Finding your best job matches...",
      "Extracting resume entities and parsing work history...",
      "Connecting to live job databases...",
      "Calculating compatibility scores..."
    ];
    
    let currentLine = 0;
    timerRef.current = setInterval(() => {
      if (currentLine < progressLines.length) {
        setScanLines(prev => {
          if (!prev.includes(progressLines[currentLine])) {
             return [...prev, progressLines[currentLine]];
          }
          return prev;
        });
        currentLine++;
      }
    }, 1500);

    try {
      let liveJobs = [];
      
      const requestBody = {
         roles: targetRoles,
         location: targetLocations.length > 0 ? targetLocations.join(', ') : "United States"
      };

      const apiUrl = import.meta.env.PROD ? '/api/jobs' : 'http://localhost:8000/api/jobs';
      const jobsResponse = await fetch(apiUrl, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(requestBody)
      });
      
      if (!jobsResponse.ok) {
         throw new Error("Failed to fetch jobs from local Python backend.");
      }
      
      const data = await jobsResponse.json();
      let fetched = data.jobs || [];
      liveJobs = fetched;
      
      const jobsToScore = liveJobs.map(j => ({ id: j.id, title: j.title, company: j.company_name }));

      const prompt = `You are an AI job-matching copilot. 
Here is a candidate's resume text:
"""
${resumeText.substring(0, 3000)}
"""
Here are ${jobsToScore.length} real job openings:
${JSON.stringify(jobsToScore)}

Assign a compatibility score (1-100) to each job based on how well the resume matches the job title.
Return ONLY a valid JSON array of objects with keys "id" (number) and "score" (number). Do NOT wrap in markdown. Output ONLY valid JSON.`;

      let rawJson = "";
      
      if (apiKey.startsWith('AIza')) {
          // Gemini
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3 }
            })
          });
          if (!response.ok) throw new Error('Gemini API Error - Check your key');
          const result = await response.json();
          rawJson = result.candidates[0].content.parts[0].text.trim();
          
      } else if (apiKey.startsWith('gsk_')) {
          // Groq
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'openai/gpt-oss-20b',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.3,
            })
          });
          if (!response.ok) throw new Error('Groq API Error - Check your key');
          const result = await response.json();
          rawJson = result.choices[0].message.content.trim();
          
      } else {
          // OpenRouter (Catch-all for sk-or- and standard openai format)
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey.trim()}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'http://localhost:5173',
              'X-Title': 'HireNudge'
            },
            body: JSON.stringify({
              model: 'poolside/laguna-s-2.1:free',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.3,
              max_tokens: 2000
            })
          });
          if (!response.ok) throw new Error('OpenRouter API Error - Check your key');
          const result = await response.json();
          rawJson = result.choices[0].message.content.trim();
      }
      
      const jsonMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
          rawJson = jsonMatch[1];
      } else {
          const firstBracket = rawJson.indexOf('[');
          const lastBracket = rawJson.lastIndexOf(']');
          if (firstBracket !== -1 && lastBracket !== -1) {
              rawJson = rawJson.substring(firstBracket, lastBracket + 1);
          }
      }
      
      let scores = [];
      try {
        scores = JSON.parse(rawJson);
      } catch(e) {
        scores = []; 
      }
      
      const finalJobs = liveJobs.map(job => {
         const scoreObj = scores.find(s => s.id == job.id);
         return {
            title: job.title,
            company: job.company_name,
            location: job.candidate_required_location || 'Remote',
            score: scoreObj ? scoreObj.score : Math.floor(Math.random() * 30 + 60),
            url: job.url
         };
      }).sort((a, b) => b.score - a.score);

      setJobs(finalJobs);

      clearInterval(timerRef.current);
      setScanLines(prev => [...prev, "Match analysis complete!"]);
      timeoutRef.current = setTimeout(() => setStep(4), 1000);

    } catch (err) {
      clearInterval(timerRef.current);
      alert("Failed to match jobs: " + err.message);
      setStep(2);
    }
  };

  const variants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };

  const renderSidebar = () => (
    <div className="onboarding-sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
        <AlertTriangle size={18} /> Set up your profile to get better job matches
      </div>

      <div className={`step-indicator ${step === 0 ? 'active' : ''}`} onClick={() => step < 3 && setStep(0)} style={{ cursor: step < 3 ? 'pointer' : 'default' }}>
        <div className="step-icon"><Target size={18} /></div>
        <div className="step-text">
          <h4>Add Career Goals</h4>
          <p>Tell us what roles and locations you're targeting.</p>
        </div>
      </div>
      
      <div className={`step-indicator ${step === 1 ? 'active' : ''}`} onClick={() => step < 3 && setStep(1)} style={{ cursor: step < 3 ? 'pointer' : 'default' }}>
        <div className="step-icon"><Briefcase size={18} /></div>
        <div className="step-text">
          <h4>Experience & Skills</h4>
          <p>Share your experience level and key skills.</p>
        </div>
      </div>

      <div className={`step-indicator ${step === 2 ? 'active' : ''}`} onClick={() => step < 3 && setStep(2)} style={{ cursor: step < 3 ? 'pointer' : 'default' }}>
        <div className="step-icon"><FileUp size={18} /></div>
        <div className="step-text">
          <h4>Upload Resume</h4>
          <p>Optimize content and unlock smarter matching.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="onboarding-container" style={{ padding: '4rem 2rem' }}>
      <div className="onboarding-nav" style={{ top: '2rem', left: '2rem' }}>
        {step !== 3 && (
          <button className="nav-icon-btn" onClick={onHome}>
            <Home size={16} /> HOME
          </button>
        )}
      </div>

      {step !== 3 && step !== 4 && (
        <div style={{ position: 'absolute', top: '2rem', right: '2rem', zIndex: 50 }}>
          <input 
            type="password" 
            placeholder="Groq / Gemini / OpenRouter Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              fontFamily: 'inherit',
              fontSize: '0.75rem',
              outline: 'none',
              width: '260px'
            }}
          />
        </div>
      )}

      {step < 3 ? (
        <div className="onboarding-layout">
          {renderSidebar()}
          
          <div className="step-content">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="step0" variants={variants} initial="initial" animate="animate" exit="exit">
                  <div className="step-header">STEP 1 OF 3</div>
                  <h2 className="step-title-main">Tell Us What You're Looking For</h2>
                  <p className="step-subtitle">We'll use this to match you with the most relevant opportunities.</p>
                  
                  <div className="form-group" style={{ marginBottom: '2rem' }}>
                    <label>Target Roles *</label>
                    <div className="tag-input-container">
                      {targetRoles.map((r, i) => (
                        <div key={i} className="tag-pill">
                          {r}
                          <button type="button" onClick={() => setTargetRoles(prev => prev.filter((_, idx) => idx !== i))}><X size={14}/></button>
                        </div>
                      ))}
                      <input 
                        type="text" 
                        className="tag-input-field" 
                        placeholder={targetRoles.length === 0 ? "Type a role, e.g. Product Manager" : "Add another role..."}
                        value={roleInput}
                        onChange={(e) => { setRoleInput(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        onKeyDown={(e) => {
                          if(e.key === 'Enter') {
                            e.preventDefault();
                            if(roleInput.trim()) {
                              setTargetRoles([...targetRoles, roleInput.trim()]);
                              setRoleInput('');
                            }
                          } else if (e.key === 'Backspace' && !roleInput) {
                            setTargetRoles(prev => prev.slice(0, -1));
                          }
                        }}
                      />
                      
                      {showSuggestions && roleInput && (
                        <ul className="suggestions-dropdown">
                          {SUGGESTIONS.filter(s => s.toLowerCase().includes(roleInput.toLowerCase()) && !targetRoles.includes(s)).map((s, i) => (
                            <li key={i} onMouseDown={() => {
                              setTargetRoles([...targetRoles, s]);
                              setRoleInput('');
                              setShowSuggestions(false);
                            }}>{s}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Preferred Industry / Country *</label>
                    <div className="tag-input-container">
                      {targetLocations.map((loc, i) => (
                        <div key={i} className="tag-pill">
                          {loc}
                          <button type="button" onClick={() => setTargetLocations(prev => prev.filter((_, idx) => idx !== i))}><X size={14}/></button>
                        </div>
                      ))}
                      <input 
                        type="text" 
                        className="tag-input-field" 
                        placeholder={targetLocations.length === 0 ? "e.g. Fintech, USA, Remote..." : "Add another..."}
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        onKeyDown={(e) => {
                          if(e.key === 'Enter') {
                            e.preventDefault();
                            if(locationInput.trim()) {
                              setTargetLocations([...targetLocations, locationInput.trim()]);
                              setLocationInput('');
                            }
                          } else if (e.key === 'Backspace' && !locationInput) {
                            setTargetLocations(prev => prev.slice(0, -1));
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '3rem' }}>
                    <button 
                      className="submit-btn" 
                      onClick={() => {
                        if(targetRoles.length === 0) alert("Please enter at least one target role");
                        else if(targetLocations.length === 0) alert("Please enter at least one preferred industry or location");
                        else setStep(1);
                      }}
                      style={{ display: 'inline-block', width: 'auto', padding: '1rem 3rem' }}
                    >
                      Save and Continue
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div key="step1" variants={variants} initial="initial" animate="animate" exit="exit">
                  <div className="step-header">STEP 2 OF 3</div>
                  <h2 className="step-title-main">Work Experience</h2>
                  <p className="step-subtitle">This helps us tailor recommendations and improve your resume.</p>
                  
                  <div className="form-group" style={{ marginBottom: '2rem' }}>
                    <label>Experience Level *</label>
                    <div className="brutalist-checkbox-group">
                      {['Intern / New Grad', 'Entry Level (1-3 years)', 'Mid Level (2-5 years)', 'Senior Level (5+ years)', 'Lead / Staff', 'Director / Executive'].map(level => (
                        <div 
                          key={level}
                          className={`brutalist-checkbox ${experience === level ? 'selected' : ''}`}
                          onClick={() => setExperience(level)}
                        >
                          {level}
                        </div>
                      ))}
                    </div>
                  </div>

                  <AnimatePresence>
                    {experience === 'Intern / New Grad' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                        animate={{ opacity: 1, height: 'auto', marginTop: '2rem' }} 
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="form-group"
                        style={{ overflow: 'hidden' }}
                      >
                        <label>Choose Internship Duration *</label>
                        <div className="brutalist-checkbox-group" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                          {['1 Month', '2 Months', '3 Months', '6+ Months'].map(duration => (
                            <div 
                              key={duration}
                              className={`brutalist-checkbox ${internDurations.includes(duration) ? 'selected' : ''}`}
                              onClick={() => {
                                if (internDurations.includes(duration)) {
                                  setInternDurations(prev => prev.filter(d => d !== duration));
                                } else {
                                  setInternDurations(prev => [...prev, duration]);
                                }
                              }}
                              style={{ padding: '0.75rem', textAlign: 'center', justifyContent: 'center', fontSize: '0.9rem' }}
                            >
                              {duration}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem' }}>
                    <button 
                      className="submit-btn" 
                      onClick={() => setStep(0)}
                      style={{ width: 'auto', padding: '1rem 2rem', background: 'transparent', color: '#fff' }}
                    >
                      Back
                    </button>
                    <button 
                      className="submit-btn" 
                      onClick={() => {
                        if(!experience) alert("Please select an experience level");
                        else if (experience === 'Intern / New Grad' && internDurations.length === 0) alert("Please select at least one internship duration");
                        else setStep(2);
                      }}
                      style={{ width: 'auto', padding: '1rem 3rem' }}
                    >
                      Save and Continue
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" variants={variants} initial="initial" animate="animate" exit="exit">
                  <div className="step-header">LAST STEP</div>
                  <h2 className="step-title-main">Upload Your Resume</h2>
                  <p className="step-subtitle">We'll analyze it to improve your score and match you with better jobs.</p>
                  
                  <input 
                    type="file" 
                    accept=".pdf" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handleFileChange}
                  />

                  <div 
                    className="option-card" 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ borderStyle: 'dashed', padding: '4rem 2rem', background: 'transparent', width: '100%', maxWidth: '600px' }}
                  >
                    <FileText size={48} strokeWidth={1} style={{ marginBottom: '1rem' }} />
                    {fileName ? (
                      <>
                        <h3 style={{ fontSize: '1.2rem' }}>{fileName}</h3>
                        <p style={{ color: '#ff4444', cursor: 'pointer', marginTop: '1rem' }} onClick={(e) => { e.stopPropagation(); setFileName(''); setResumeText(''); }}>Remove</p>
                      </>
                    ) : (
                      <>
                        <h3 style={{ fontSize: '1.2rem' }}>Click to Upload Resume</h3>
                        <p>PDF only (Processed securely in browser)</p>
                      </>
                    )}
                  </div>

                  <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem' }}>
                    <button 
                      className="submit-btn" 
                      onClick={() => setStep(1)}
                      style={{ width: 'auto', padding: '1rem 2rem', background: 'transparent', color: '#fff' }}
                    >
                      Back
                    </button>
                    <button 
                      className="submit-btn" 
                      onClick={handleProcessSubmit}
                      style={{ width: 'auto', padding: '1rem 3rem' }}
                    >
                      Process and Set up
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {step === 3 && (
            <motion.div key="step3" className="step-wrapper" variants={variants} initial="initial" animate="animate" exit="exit" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
              <Loader2 size={64} className="animate-spin" style={{ marginBottom: '2rem', opacity: 0.8 }} />
              <h2 style={{ fontSize: '2rem', letterSpacing: '-0.02em', marginBottom: '1rem' }}>Setting up your profile</h2>
              <div style={{ opacity: 0.5, fontSize: '0.875rem' }}>This can take a few seconds - hang tight.</div>
              
              <div className="scan-console" style={{ marginTop: '3rem', background: 'transparent', border: 'none', textAlign: 'center' }}>
                {scanLines.map((line, i) => (
                  <motion.div key={i} initial={{opacity:0, y:5}} animate={{opacity:1, y:0}} className="scan-line" style={{ justifyContent: 'center' }}>
                    {line}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 4 && (() => {
            const displayedJobs = showAppliedOnly ? appliedJobs : showSavedOnly ? starredJobs : jobs;
            return (
            <motion.div key="step4" className="step-wrapper" style={{ maxWidth: '1200px', width: '100%' }} variants={variants} initial="initial" animate="animate" exit="exit">
              
              <AnimatePresence>
                {pendingApplyJob && (
                  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', padding: '3rem', borderRadius: '8px', maxWidth: '500px', textAlign: 'center' }}>
                      <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 500 }}>Application Status</h3>
                      <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2.5rem', lineHeight: 1.5 }}>Did you successfully submit your application for the <strong>{pendingApplyJob.title}</strong> role at {pendingApplyJob.company}?</p>
                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button className="submit-btn" style={{ background: 'transparent', padding: '0.75rem 2rem', width: 'auto', color: '#fff' }} onClick={() => setPendingApplyJob(null)}>Not Yet</button>
                        <button className="submit-btn" style={{ padding: '0.75rem 2rem', width: 'auto', background: '#fff', color: '#000' }} onClick={() => {
                          setAppliedJobs(prev => prev.some(j => j.url === pendingApplyJob.url) ? prev : [...prev, pendingApplyJob]);
                          setPendingApplyJob(null);
                        }}>Yes, Applied!</button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              <div className="job-dashboard-header">
                <h2 style={{ fontSize: '2rem', fontWeight: 500, letterSpacing: '-0.02em' }}>MATCH DASHBOARD</h2>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {displayedJobs.length} {showAppliedOnly ? 'APPLIED ROLES' : showSavedOnly ? 'SAVED ROLES' : 'HIGHLY COMPATIBLE ROLES FOUND'}
                  
                  <button 
                    className="nav-icon-btn" 
                    onClick={() => { setShowSavedOnly(!showSavedOnly); setShowAppliedOnly(false); setCurrentPage(1); }} 
                    style={{ padding: '0.5rem 1rem', border: `1px solid ${showSavedOnly ? '#ffd700' : 'rgba(255,255,255,0.2)'}`, color: showSavedOnly ? '#ffd700' : '#fff' }}
                  >
                    <Star size={14} fill={showSavedOnly ? "#ffd700" : "transparent"} style={{ marginRight: '0.25rem', marginBottom: '-0.1rem' }} />
                    SAVED ({starredJobs.length})
                  </button>

                  <button 
                    className="nav-icon-btn" 
                    onClick={() => { setShowAppliedOnly(!showAppliedOnly); setShowSavedOnly(false); setCurrentPage(1); }} 
                    style={{ padding: '0.5rem 1rem', border: `1px solid ${showAppliedOnly ? '#4ade80' : 'rgba(255,255,255,0.2)'}`, color: showAppliedOnly ? '#4ade80' : '#fff' }}
                  >
                    <CheckCircle2 size={14} style={{ marginRight: '0.25rem', marginBottom: '-0.1rem' }} />
                    APPLIED ({appliedJobs.length})
                  </button>
                  
                  <button className="nav-icon-btn" onClick={() => { setStep(0); setCurrentPage(1); setShowSavedOnly(false); setShowAppliedOnly(false); }} style={{ padding: '0.5rem 1rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                    EDIT FILTERS
                  </button>
                </div>
              </div>
              
              <div className="job-list">
                {displayedJobs.length === 0 && (showSavedOnly || showAppliedOnly) ? (
                  <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                    {showSavedOnly ? "No saved jobs yet. Click the star icon on any job to save it here." : "No applied jobs yet. Click 'Apply Now' on a job and confirm you applied to see it here."}
                  </div>
                ) : (
                  displayedJobs.slice((currentPage - 1) * jobsPerPage, currentPage * jobsPerPage).map((job, i) => (
                  <motion.div key={i} className="job-row" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: i * 0.15}}>
                    <div>
                      <div className="job-title">{job.title}</div>
                      <div className="job-company">{job.company} • {job.location}</div>
                    </div>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>COMPATIBILITY</div>
                      <div className="match-score-container">
                        <div className="match-circle">{job.score}%</div>
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>STATUS</div>
                      <div style={{ fontSize: '0.875rem', color: appliedJobs.some(j => j.url === job.url) ? '#4ade80' : '#fff' }}>
                        {appliedJobs.some(j => j.url === job.url) ? 'Applied' : 'Not Applied'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', gap: '1rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {appliedJobs.some(j => j.url === job.url) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <button className="action-btn" style={{ background: 'transparent', color: '#4ade80', border: '1px solid #4ade80', cursor: 'default' }}>
                            APPLIED
                          </button>
                          <a href={job.url} target="_blank" rel="noreferrer" title="View Job Posting" style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='#fff'} onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.5)'}>
                            <ExternalLink size={20} />
                          </a>
                        </div>
                      ) : (
                        <a href={job.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                          <button className="action-btn" onClick={() => setPendingApplyJob(job)}>Apply Now</button>
                        </a>
                      )}
                      <button 
                        onClick={() => {
                          setStarredJobs(prev => {
                            if (prev.some(j => j.url === job.url)) {
                              return prev.filter(j => j.url !== job.url);
                            }
                            return [...prev, job];
                          });
                        }}
                        style={{ background: 'transparent', border: 'none', color: starredJobs.some(j => j.url === job.url) ? '#ffd700' : '#fff', opacity: starredJobs.some(j => j.url === job.url) ? 1 : 0.5, transition: 'all 0.2s', cursor: 'pointer', padding: 0 }} 
                        onMouseEnter={e => { if(!starredJobs.some(j => j.url === job.url)) e.currentTarget.style.opacity=1; }} 
                        onMouseLeave={e => { if(!starredJobs.some(j => j.url === job.url)) e.currentTarget.style.opacity=0.5; }}
                      >
                        <Star size={20} fill={starredJobs.some(j => j.url === job.url) ? "#ffd700" : "transparent"} />
                      </button>
                    </div>
                  </motion.div>
                ))
                )}
              </div>

              {displayedJobs.length > jobsPerPage && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', marginTop: '3rem' }}>
                  <button 
                    className="action-btn"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ opacity: currentPage === 1 ? 0.3 : 1, cursor: currentPage === 1 ? 'default' : 'pointer' }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                    Page {currentPage} of {Math.ceil(displayedJobs.length / jobsPerPage)}
                  </span>
                  <button 
                    className="action-btn"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(displayedJobs.length / jobsPerPage), p + 1))}
                    disabled={currentPage === Math.ceil(displayedJobs.length / jobsPerPage)}
                    style={{ opacity: currentPage === Math.ceil(displayedJobs.length / jobsPerPage) ? 0.3 : 1, cursor: currentPage === Math.ceil(displayedJobs.length / jobsPerPage) ? 'default' : 'pointer' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </motion.div>
            );
          })()}
        </AnimatePresence>
      )}
    </div>
  );
};

export default Onboarding;
