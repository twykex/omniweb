import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import "./App.css";

const BASE_URL = "http://localhost:8000";

// Expanded topic list for variety
const ALL_TOPICS = [
  "Neural Networks", "The Renaissance", "Mars Colonization", "Jazz History",
  "Quantum Physics", "Ancient Rome", "Sustainable Energy", "Cyberpunk Literature",
  "Microbiology", "Game Theory", "Abstract Expressionism", "Cryptocurrency",
  "Philosophy of Mind", "Genetic Engineering", "Baroque Music", "Dark Matter",
  "Urban Planning", "Deep Sea Exploration", "Cognitive Science", "Post-Modern Architecture"
];

const App = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [loadingModels, setLoadingModels] = useState(true);
  const [backendError, setBackendError] = useState(false);
  const [startTopic, setStartTopic] = useState("");
  const [toasts, setToasts] = useState([]);

  const addToast = (msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const fetchModels = async () => {
    setLoadingModels(true);
    setBackendError(false);
    try {
      const res = await axios.get(`${BASE_URL}/models`);
      const models = res.data.models || [];
      setAvailableModels(models);

      // Smart selection: Prefer fitting models, then specific families
      const smartModel = models.find(m => 
          (m.name.includes("llama3") || m.name.includes("mistral") || m.name.includes("gpt")) && m.fits
      ) || models.find(m => m.fits) || models[0];

      setSelectedModel(smartModel ? smartModel.name : "");
    } catch (err) {
      console.error("Backend Offline");
      setBackendError(true);
    }
    finally { setLoadingModels(false); }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return (
    <div className="app-root">
      <BackgroundEngine />

      <AnimatePresence mode="wait">
        {!hasStarted ? (
          <LandingInterface 
            key="landing"
            models={availableModels}
            selected={selectedModel}
            onSelect={setSelectedModel}
            startTopic={startTopic}
            setStartTopic={setStartTopic}
            onStart={() => { if(startTopic.trim()) setHasStarted(true); }}
            isLoading={loadingModels}
            backendError={backendError}
            onRetry={fetchModels}
          />
        ) : (
          <LearningWorkspace 
            key="workspace" 
            model={selectedModel}
            initialTopic={startTopic}
            onExit={() => setHasStarted(false)}
            addToast={addToast}
          />
        )}
      </AnimatePresence>
      <ToastContainer toasts={toasts} />
    </div>
  );
};

// --- BACKGROUND ENGINE ---
const BackgroundEngine = () => (
  <div className="bg-engine">
    <div className="orb orb-1"></div>
    <div className="orb orb-2"></div>
    <div className="orb orb-3"></div>
    <div className="bg-noise"></div>
  </div>
);

// --- WORKSPACE COMPONENT ---
const LearningWorkspace = ({ model, initialTopic, onExit, addToast }) => {
  const [columns, setColumns] = useState([{ 
    id: "root", 
    selectedNode: null, 
    nodes: [{ name: initialTopic, desc: "The starting point of your journey.", status: "concept" }] 
  }]);

  const [lessonData, setLessonData] = useState(null);
  const [analyzingNode, setAnalyzingNode] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef(null);
  const endRef = useRef(null);
  const abortControllerRef = useRef(null);

  const closeLesson = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLessonData(null);
  };

  useEffect(() => {
    if (endRef.current) {
      setTimeout(() => {
        endRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }, 100);
    }
  }, [columns, isThinking]);

  // Handle Escape Key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (lessonData) closeLesson();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lessonData]);

  const handleNodeClick = async (colIndex, node) => {
    if (columns[colIndex].selectedNode === node.name) return;
    if (isThinking) return;

    const newCols = columns.slice(0, colIndex + 1);
    newCols[colIndex] = { ...newCols[colIndex], selectedNode: node.name };
    setColumns(newCols);

    setIsThinking(true);
    try {
      const contextPath = newCols.map(c => c.selectedNode).filter(Boolean).join(" > ");
      
      // Send recent nodes to avoid duplicates (from Main branch logic)
      const recentNodes = [];
      if (columns[colIndex]) columns[colIndex].nodes.forEach(n => recentNodes.push(n.name));
      if (colIndex > 0 && columns[colIndex - 1]) columns[colIndex - 1].nodes.forEach(n => recentNodes.push(n.name));

      const res = await axios.post(`${BASE_URL}/expand`, {
        node: node.name,
        context: contextPath,
        model: model,
        temperature: 0.5,
        recent_nodes: recentNodes
      });

      if (res.data.children && res.data.children.length > 0) {
        setColumns([...newCols, { 
          id: node.name, 
          selectedNode: null, 
          nodes: res.data.children 
        }]);
      }
    } catch (err) {
        console.error(err);
        addToast("Failed to expand node", "error");
    } finally { setIsThinking(false); }
  };

  const openLesson = async (nodeName, mode) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setAnalyzingNode(nodeName);
    setLessonData({ content: "", mode: mode, isLoading: true });

    try {
      const contextPath = columns.map(c => c.selectedNode).filter(Boolean).join(" > ");
      
      // Use fetch for Streaming (from Main branch logic)
      const response = await fetch(`${BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node: nodeName,
          context: contextPath,
          model: model,
          mode: mode
        }),
        signal: controller.signal
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setLessonData(prev => {
            if (!prev) return null;
            return { 
              ...prev, 
              content: prev.content + chunk,
              isLoading: false 
            };
          });
        }
      }
      setLessonData(prev => prev ? { ...prev, isLoading: false } : null);

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Lesson generation aborted');
      } else {
        console.error(err);
        setLessonData({ content: "Connection lost.", mode: mode, isLoading: false });
        addToast("Failed to load lesson", "error");
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleBreadcrumbClick = (index) => {
      if (index + 1 < columns.length) {
          setColumns(columns.slice(0, index + 2));
      }
  };

  const readingTime = lessonData && lessonData.content && lessonData.content.trim() ? Math.ceil(lessonData.content.split(/\s+/).length / 200) : 0;

  const processedContent = lessonData?.content || "";

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="workspace"
    >
      <header className="hud-header">
        <div className="brand" onClick={onExit}>
          OMNI<span className="brand-thin">WEB</span>
        </div>
        <div className="breadcrumbs">
          {columns.map((col, i) => (
             col.selectedNode && (
               <React.Fragment key={i}>
                 <span 
                   className="crumb" 
                   onClick={() => handleBreadcrumbClick(i)}
                   style={{cursor: 'pointer'}}
                   title="Navigate to this level"
                 >
                    {col.selectedNode}
                 </span>
                 <span className="sep">/</span>
               </React.Fragment>
             )
          ))}
        </div>
        <button className="exit-icon-btn" onClick={onExit} title="Exit">✕</button>
      </header>

      <div className="miller-columns-container" ref={scrollRef}>
        {columns.map((col, colIdx) => (
          <motion.div 
            key={`${col.id}-${colIdx}`}
            initial={{ opacity: 0, x: 50 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="column"
          >
            <div className="column-header">
              LEVEL {colIdx + 1}
            </div>
            <div className="node-list">
              {col.nodes.map((node) => (
                <NodeCard 
                  key={node.name} 
                  node={node} 
                  isActive={col.selectedNode === node.name}
                  onClick={() => handleNodeClick(colIdx, node)}
                  onAction={(mode) => openLesson(node.name, mode)}
                />
              ))}
            </div>
          </motion.div>
        ))}
        
        {isThinking && <SkeletonColumn />}
        <div ref={endRef} style={{minWidth: "60px", height: "100%"}} />
      </div>

      <AnimatePresence>
        {lessonData && (
          <>
            <motion.div 
                className="lesson-backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={closeLesson}
            />
            <motion.div 
                className="lesson-panel"
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
            >
                <div className="panel-header">
                    <div className="panel-kicker">LEARNING MODULE</div>
                    <h3>{analyzingNode}</h3>
                    {!lessonData.isLoading && <div className="panel-meta">{readingTime} MIN READ</div>}
                </div>

                <div className="panel-tabs">
                    {['explain', 'history', 'impact', 'eli5', 'quiz'].map(m => (
                        <button 
                            key={m} 
                            className={lessonData.mode === m ? 'active' : ''}
                            onClick={() => openLesson(analyzingNode, m)}
                        >
                            {m.toUpperCase()}
                        </button>
                    ))}
                </div>

                <div className="panel-content custom-scroll">
                {lessonData.isLoading ? (
                    <div className="text-skeleton">
                        <div className="sk-line w-75"></div>
                        <div className="sk-line w-100"></div>
                        <div className="sk-line w-100"></div>
                        <div className="sk-line w-50"></div>
                        <br/>
                        <div className="sk-line w-100"></div>
                        <div className="sk-line w-75"></div>
                    </div>
                ) : (
                    <ReactMarkdown components={{
                        blockquote: ({node, ...props}) => <div className="quote-box" {...props} />
                    }}>
                        {processedContent}
                    </ReactMarkdown>
                )}
                </div>

                <div className="panel-footer">
                    <button onClick={() => {
                        navigator.clipboard.writeText(lessonData.content);
                        addToast("Lesson text copied to clipboard", "success");
                    }}>COPY TEXT</button>
                    <button onClick={closeLesson}>CLOSE</button>
                </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- SUB COMPONENTS ---

const NodeCard = ({ node, isActive, onClick, onAction }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div 
      className={`node-card ${isActive ? 'active' : ''}`}
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      layout
    >
      <div className="node-content">
        <div className="node-name">{node.name}</div>
        <div className="node-desc">{node.desc}</div>
      </div>

      <AnimatePresence>
        {(isActive || isHovered) && (
          <motion.div 
            className="node-actions"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ActionButton icon={<Icons.Explain />} label="Explain" onClick={() => onAction('explain')} />
            <ActionButton icon={<Icons.History />} label="History" onClick={() => onAction('history')} />
            <ActionButton icon={<Icons.Impact />} label="Impact" onClick={() => onAction('impact')} />
            <ActionButton icon={<Icons.ELI5 />} label="ELI5" onClick={() => onAction('eli5')} />
            <ActionButton icon={<Icons.Quiz />} label="Quiz" onClick={() => onAction('quiz')} />
          </motion.div>
        )}
      </AnimatePresence>

      {isActive && <motion.div layoutId="activeGlow" className="active-glow" />}
    </motion.div>
  );
};

const ActionButton = ({ label, icon, onClick }) => (
    <button className="action-btn" onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <span className="btn-icon">{icon}</span>
        <span className="btn-label">{label}</span>
    </button>
);

const Icons = {
  Explain: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"></path>
      <path d="M9 21h6"></path>
    </svg>
  ),
  History: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  ),
  Impact: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
    </svg>
  ),
  ELI5: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
      <line x1="9" y1="9" x2="9.01" y2="9"></line>
      <line x1="15" y1="9" x2="15.01" y2="9"></line>
    </svg>
  ),
  Quiz: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  )
};

const SkeletonColumn = () => (
    <div className="column">
        <div className="column-header loading-text">THINKING...</div>
        <div className="node-list">
            {[1,2,3,4].map(i => (
                <div key={i} className="node-card skeleton-card">
                    <div className="sk-line w-50" style={{height: 20, marginBottom: 8}}></div>
                    <div className="sk-line w-100"></div>
                </div>
            ))}
        </div>
    </div>
);

const ToastContainer = ({ toasts }) => (
    <div className="toast-container">
        <AnimatePresence>
            {toasts.map(toast => (
                <motion.div
                    key={toast.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`toast ${toast.type}`}
                >
                    {toast.type === 'success' && <span style={{color: 'currentColor'}}>✓</span>}
                    {toast.type === 'error' && <span style={{color: 'currentColor'}}>!</span>}
                    <span style={{color: '#fff'}}>{toast.msg}</span>
                </motion.div>
            ))}
        </AnimatePresence>
    </div>
);

// --- COMPONENT MERGES (Redesign + Functionality) ---

const FeatureCard = ({ icon, title, desc }) => (
  <motion.div 
    className="feature-card"
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    }}
  >
    <div className="feature-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{desc}</p>
  </motion.div>
);

const ModelSelector = ({ models, selected, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const close = () => setIsOpen(false);
    if (isOpen) window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [isOpen]);

  const selectedModelObj = models.find(m => m.name === selected);

  return (
    <div className="model-selector-container" onClick={e => e.stopPropagation()}>
      <div className="model-selector-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span className="dot online"></span>
        <span className="selected-name">
            {selectedModelObj ? selectedModelObj.name.toUpperCase() : "SELECT MODEL"}
        </span>
        <span className="arrow" style={{ fontSize: '10px', marginLeft: '8px' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="model-dropdown"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {models.map(m => (
              <div
                key={m.name}
                className={`model-option ${m.name === selected ? 'selected' : ''} ${!m.fits ? 'warning' : ''}`}
                onClick={() => {
                    onSelect(m.name);
                    setIsOpen(false);
                }}
              >
                <div className="model-info">
                    <div className="model-name">{m.name.toUpperCase()}</div>
                    <div className="model-meta">
                        {m.size_gb} GB • {m.fits ? <span className="fit-ok">Fits in VRAM</span> : <span className="fit-bad">⚠️ May not fit</span>}
                    </div>
                </div>
                {m.name === selected && <div className="check">✓</div>}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LandingInterface = ({ models, selected, onSelect, onStart, isLoading, startTopic, setStartTopic, backendError, onRetry }) => {
  const inputRef = useRef(null);
  const [displayTopics, setDisplayTopics] = useState([]);

  const shuffleTopics = React.useCallback(() => {
    const shuffled = [...ALL_TOPICS].sort(() => 0.5 - Math.random());
    setDisplayTopics(shuffled.slice(0, 4));
  }, []);

  useEffect(() => {
    // Initial random selection
    shuffleTopics();
  }, [shuffleTopics]);

  return (
    <motion.div 
      className="landing-container custom-scroll"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="landing-content">
        <motion.div 
          initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.8 }}
        >
          <h1 className="hero-title">
            Omni<span className="accent">Web</span>
          </h1>
          <p className="hero-subtitle">
            The Infinite Learning Engine.<br/>
            Designed for students, researchers, and the endlessly curious.
          </p>
        </motion.div>

        <motion.div 
          className="search-wrapper"
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}
        >
          <input 
              ref={inputRef}
              type="text" 
              value={startTopic}
              onChange={(e) => setStartTopic(e.target.value)}
              placeholder="What do you want to learn today?"
              onKeyDown={(e) => e.key === 'Enter' && startTopic.trim() && onStart()}
              autoFocus
              disabled={backendError}
          />
          {startTopic && (
            <button
                className="clear-btn"
                onClick={() => { setStartTopic(""); inputRef.current?.focus(); }}
                title="Clear"
            >
                ✕
            </button>
          )}
          <button onClick={onStart} disabled={isLoading || backendError || !startTopic.trim()} className="go-btn">
               ➜
          </button>
        </motion.div>

        <motion.div 
          className="suggested-topics"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        >
          <span>Try:</span>
          <AnimatePresence mode="wait">
            {displayTopics.map(topic => (
              <motion.button
                key={topic}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                layout
                className="topic-tag"
                onClick={() => {
                  setStartTopic(topic);
                  inputRef.current?.focus();
                }}
              >
                {topic}
              </motion.button>
            ))}
          </AnimatePresence>
          <button className="topic-refresh-btn" onClick={shuffleTopics} title="Shuffle Topics">
             ↻
          </button>
        </motion.div>

        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="landing-footer"
        >
            {isLoading ? (
                <span className="status-connecting">INITIALIZING BRAIN...</span>
            ) : backendError ? (
                <div className="error-state">
                  <span className="error-msg">⚠️ Backend Offline</span>
                  <button onClick={onRetry} className="retry-btn">RETRY CONNECTION</button>
                  <div className="error-hint">Ensure <code>server.py</code> and <code>Ollama</code> are running.</div>
                </div>
            ) : (
                <ModelSelector models={models} selected={selected} onSelect={onSelect} />
            )}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="kicker"
        >
          THE NEW AGE OF LEARNING
        </motion.div>

        <motion.div 
          className="features-grid"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.1, delayChildren: 0.8 } }
          }}
        >
          <FeatureCard 
              icon="🌌" 
              title="Infinite Recursion" 
              desc="Recursively break down topics forever. There is no limit to how deep you can go." 
          />
          <FeatureCard 
              icon="🧠" 
              title="Visual Knowledge" 
              desc="Navigate ideas spatially with Miller Columns. See how every concept connects." 
          />
          <FeatureCard 
              icon="🎓" 
              title="Deep Insights" 
              desc="Get professor-style explanations, historical context, and real-world impact instantly." 
          />
          <FeatureCard 
              icon="🛡️" 
              title="Local & Private" 
              desc="Powered by local LLMs running on your machine. Your learning journey is 100% private." 
          />
        </motion.div>

        <div className="landing-bottom-bar">
            <span>© 2025 OMNIWEB Research</span>
            <span className="separator">|</span>
            <a href="#" onClick={(e) => e.preventDefault()}>About</a>
            <span className="separator">|</span>
            <a href="#" onClick={(e) => e.preventDefault()}>Github</a>
        </div>
      </div>
    </motion.div>
  );
};

// --- CSS STYLES ---

export default App;