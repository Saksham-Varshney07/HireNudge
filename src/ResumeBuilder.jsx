import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ChevronLeft, FileText, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const RichTextEditor = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command, val = null) => {
    document.execCommand(command, false, val);
    if (editorRef.current) editorRef.current.focus();
    handleInput();
  };

  return (
    <div className="rich-editor-wrapper">
      <div className="editor-toolbar">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand('bold'); }}><b>B</b></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand('italic'); }}><i>I</i></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand('underline'); }}><u>U</u></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand('insertUnorderedList'); }}>• List</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand('insertOrderedList'); }}>1. List</button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="resume-textarea"
        style={{ minHeight: '120px', padding: '1rem', outline: 'none' }}
        onInput={handleInput}
        onBlur={handleInput}
        suppressContentEditableWarning={true}
        data-placeholder={placeholder}
      />
    </div>
  );
};

const ResumeBuilder = ({ onHome }) => {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  
  const [resumeData, setResumeData] = useState({
    education: '',
    experience: [],
    skills: '',
    projects: []
  });

  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setStep(1);

    let fullText = '';
    try {
      if (selectedFile.type === 'application/pdf') {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map(item => item.str).join(' ') + '\n';
        }
      } else {
        fullText = await selectedFile.text();
      }
    } catch (err) {
      console.error("Error reading file:", err);
      fullText = await selectedFile.text().catch(() => "Could not extract text from this file.");
    }

    let parsedData = null;
    const apiKey = localStorage.getItem('hirenudge_llm_key') || '';
    
    if (apiKey && fullText.trim().length > 50) {
        try {
            const prompt = `Extract the resume into JSON with exactly this structure:
{
  "education": "HTML formatted string summarizing all education",
  "skills": "HTML formatted string summarizing all skills",
  "experience": [
    { "company": "Company Name", "role": "Job Title", "startDate": "YYYY-MM", "endDate": "YYYY-MM", "current": boolean, "description": "HTML formatted description, use <ul><li> for bullet points" }
  ],
  "projects": [
    { "name": "Project Name", "technologies": "Tech stack used", "description": "HTML formatted description, use <ul><li> for bullet points" }
  ]
}
Return ONLY valid JSON without markdown wrapping. For dates, if month is missing default to 01.

Text:
${fullText.substring(0,4000)}`;

            let rawJson = "";
            
            if (apiKey.startsWith('AIza')) {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                   method: 'POST', headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1 } })
                });
                if (res.ok) {
                    const data = await res.json();
                    rawJson = data.candidates[0].content.parts[0].text;
                }
            } else if (apiKey.startsWith('gsk_')) {
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                   method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                   body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], temperature: 0.1 })
                });
                if (res.ok) {
                    const data = await res.json();
                    rawJson = data.choices[0].message.content;
                }
            } else {
                const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                   method: 'POST', headers: { 'Authorization': `Bearer ${apiKey.trim()}`, 'Content-Type': 'application/json' },
                   body: JSON.stringify({ model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{ role: 'user', content: prompt }], temperature: 0.1 })
                });
                if (res.ok) {
                    const data = await res.json();
                    rawJson = data.choices[0].message.content;
                }
            }
            
            const jsonMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                rawJson = jsonMatch[1];
            } else {
                const firstBrace = rawJson.indexOf('{');
                const lastBrace = rawJson.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    rawJson = rawJson.substring(firstBrace, lastBrace + 1);
                }
            }
            
            parsedData = JSON.parse(rawJson);
        } catch (llmErr) {
            console.error("LLM Parsing failed", llmErr);
        }
    }

    if (parsedData && (parsedData.experience?.length > 0 || parsedData.projects?.length > 0 || parsedData.education)) {
        setResumeData({
            education: parsedData.education || '',
            experience: Array.isArray(parsedData.experience) ? parsedData.experience : [],
            skills: parsedData.skills || '',
            projects: Array.isArray(parsedData.projects) ? parsedData.projects : []
        });
    } else {
        const lower = fullText.toLowerCase();
        
        const findSection = (kws) => {
            for (let kw of kws) {
                const idx = lower.indexOf(kw);
                if (idx !== -1) return idx;
            }
            return -1;
        };
        
        const eduIdx = findSection(['education', 'academic background']);
        const expIdx = findSection(['experience', 'employment', 'work history', 'professional experience']);
        const skillIdx = findSection(['skills', 'technologies', 'core competencies']);
        const projIdx = findSection(['projects', 'personal projects', 'academic projects']);
        
        const indices = [
            { name: 'education', idx: eduIdx },
            { name: 'experience', idx: expIdx },
            { name: 'skills', idx: skillIdx },
            { name: 'projects', idx: projIdx }
        ].filter(x => x.idx !== -1).sort((a,b) => a.idx - b.idx);
        
        const rawSections = { education: '', experience: '', skills: '', projects: '' };
        
        if (indices.length === 0) {
            rawSections.experience = fullText; 
        } else {
            for (let i = 0; i < indices.length; i++) {
                const curr = indices[i];
                const nextIdx = i < indices.length - 1 ? indices[i+1].idx : fullText.length;
                rawSections[curr.name] = fullText.substring(curr.idx, nextIdx).trim();
            }
        }
        
        setResumeData({
            education: rawSections.education,
            skills: rawSections.skills,
            experience: rawSections.experience ? [{ company: '', role: 'Experience Entry', startDate: '', endDate: '', current: false, description: rawSections.experience }] : [],
            projects: rawSections.projects ? [{ name: 'Project Entry', technologies: '', description: rawSections.projects }] : []
        });
    }

    setTimeout(() => {
      setStep(2);
    }, 1500);
  };

  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const updateExperience = (index, field, value) => {
    const newExp = [...resumeData.experience];
    newExp[index] = { ...newExp[index], [field]: value };
    setResumeData({ ...resumeData, experience: newExp });
  };
  const addExperience = () => {
    setResumeData({ ...resumeData, experience: [...resumeData.experience, { company: '', role: '', startDate: '', endDate: '', current: false, description: '' }] });
  };
  const removeExperience = (index) => {
    const newExp = resumeData.experience.filter((_, i) => i !== index);
    setResumeData({ ...resumeData, experience: newExp });
  };

  const updateProject = (index, field, value) => {
    const newProj = [...resumeData.projects];
    newProj[index] = { ...newProj[index], [field]: value };
    setResumeData({ ...resumeData, projects: newProj });
  };
  const addProject = () => {
    setResumeData({ ...resumeData, projects: [...resumeData.projects, { name: '', technologies: '', description: '' }] });
  };
  const removeProject = (index) => {
    const newProj = resumeData.projects.filter((_, i) => i !== index);
    setResumeData({ ...resumeData, projects: newProj });
  };

  return (
    <div className="onboarding-container" style={{ alignItems: 'flex-start', paddingTop: '6rem' }}>
      <div className="onboarding-nav">
        <button className="nav-icon-btn" onClick={onHome}>
          <ChevronLeft size={16} />
          HOME
        </button>
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="step-wrapper">
            <h2 className="step-title" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Optimize Your Resume</h2>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginBottom: '3rem' }}>Upload your current resume. Our AI will extract the sections and prepare them for targeted optimization.</p>
            <div className="upload-box" onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDrop={handleDrop}
              style={{
                border: '1px dashed rgba(255,255,255,0.2)', padding: '5rem 2rem', textAlign: 'center', cursor: 'pointer',
                borderRadius: '8px', background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" style={{ display: 'none' }} />
              <Upload size={48} style={{ margin: '0 auto 1.5rem', color: 'rgba(255,255,255,0.5)' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Drop your resume here</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>PDF format up to 5MB</p>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="extracting" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="step-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
            <div className="match-circle" style={{ width: '80px', height: '80px', marginBottom: '2rem', animation: 'pulse 1.5s infinite' }}>
              <FileText size={32} color="#4ade80" />
            </div>
            <h3 style={{ fontSize: '1.5rem', letterSpacing: '0.05em' }}>Extracting Sub-Sections...</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '1rem' }}>Structuring individual experiences and projects.</p>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="editor" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="step-wrapper" style={{ maxWidth: '1000px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: '500', marginBottom: '0.5rem' }}>Resume Sections</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>Review and edit the extracted content.</p>
              </div>
              <button className="action-btn" onClick={() => {
                setStep(3);
                setTimeout(() => setStep(4), 2500);
              }} style={{ background: '#4ade80', color: '#000', border: 'none' }}>Save & Proceed</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Experience Array */}
              <div className="resume-section-card">
                <div className="resume-section-header">
                  <h3 style={{ fontSize: '1rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <CheckCircle2 size={16} color="#4ade80" /> Work Experience
                  </h3>
                  <button onClick={addExperience} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                    <Plus size={14} /> Add Role
                  </button>
                </div>
                {resumeData.experience.map((exp, idx) => (
                  <div key={idx} className="sub-card" style={{ position: 'relative' }}>
                    <button onClick={() => removeExperience(idx)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    <input className="sub-input" placeholder="Role / Title" value={exp.role} onChange={(e) => updateExperience(idx, 'role', e.target.value)} style={{ fontSize: '1.1rem', color: '#4ade80' }} />
                    <input className="sub-input" placeholder="Company Name" value={exp.company} onChange={(e) => updateExperience(idx, 'company', e.target.value)} />
                    
                    <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>START DATE</span>
                        <input type="month" className="sub-input" value={exp.startDate} onChange={(e) => updateExperience(idx, 'startDate', e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>END DATE</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <input type="month" className="sub-input" value={exp.endDate} onChange={(e) => updateExperience(idx, 'endDate', e.target.value)} disabled={exp.current} style={{ opacity: exp.current ? 0.3 : 1, width: '100%' }} />
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                            <input type="checkbox" checked={exp.current} onChange={(e) => updateExperience(idx, 'current', e.target.checked)} /> Present
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <RichTextEditor placeholder="Describe your achievements..." value={exp.description} onChange={(val) => updateExperience(idx, 'description', val)} />
                  </div>
                ))}
              </div>

              {/* Projects Array */}
              <div className="resume-section-card">
                <div className="resume-section-header">
                  <h3 style={{ fontSize: '1rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <CheckCircle2 size={16} color="#4ade80" /> Projects
                  </h3>
                  <button onClick={addProject} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                    <Plus size={14} /> Add Project
                  </button>
                </div>
                {resumeData.projects.map((proj, idx) => (
                  <div key={idx} className="sub-card" style={{ position: 'relative' }}>
                    <button onClick={() => removeProject(idx)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    <input className="sub-input" placeholder="Project Name" value={proj.name} onChange={(e) => updateProject(idx, 'name', e.target.value)} style={{ fontSize: '1.1rem', color: '#4ade80' }} />
                    <input className="sub-input" placeholder="Technologies / Stack" value={proj.technologies} onChange={(e) => updateProject(idx, 'technologies', e.target.value)} />
                    <RichTextEditor placeholder="Project Description" value={proj.description} onChange={(val) => updateProject(idx, 'description', val)} />
                  </div>
                ))}
              </div>

              {/* Skills */}
              <div className="resume-section-card">
                <div className="resume-section-header">
                  <h3 style={{ fontSize: '1rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <CheckCircle2 size={16} color="#4ade80" /> Skills & Tools
                  </h3>
                </div>
                <RichTextEditor placeholder="List your skills..." value={resumeData.skills} onChange={(val) => setResumeData({...resumeData, skills: val})} />
              </div>

              {/* Education */}
              <div className="resume-section-card">
                <div className="resume-section-header">
                  <h3 style={{ fontSize: '1rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <CheckCircle2 size={16} color="#4ade80" /> Education
                  </h3>
                </div>
                <RichTextEditor placeholder="Education details..." value={resumeData.education} onChange={(val) => setResumeData({...resumeData, education: val})} />
              </div>

            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="saving" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="step-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
            <div className="match-circle" style={{ width: '80px', height: '80px', marginBottom: '2rem', animation: 'pulse 1.5s infinite' }}>
              <CheckCircle2 size={32} color="#4ade80" />
            </div>
            <h3 style={{ fontSize: '1.5rem', letterSpacing: '0.05em' }}>Saving Preferences...</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '1rem' }}>Encrypting and storing your personal details for optimization.</p>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="ready" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="step-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', textAlign: 'center' }}>
            <CheckCircle2 size={64} color="#4ade80" style={{ marginBottom: '2rem' }} />
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Resume Profile Saved</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '500px', lineHeight: '1.6', marginBottom: '3rem' }}>
              Your foundational data has been securely stored. HireNudge AI is now ready to dynamically optimize your resume for incoming job matches.
            </p>
            <button className="action-btn" onClick={onHome} style={{ background: '#fff', color: '#000', border: 'none' }}>
              Return to Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResumeBuilder;
