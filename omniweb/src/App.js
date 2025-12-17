import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import "./App.css";
import ErrorBoundary from "./ErrorBoundary";

const BASE_URL = "http://localhost:8000";

const App = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [loadingModels, setLoadingModels] = useState(true);
  const [startTopic, setStartTopic] = useState("");
  const [toasts, setToasts] = useState([]);

  const addToast = (msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/models`);
        const models = res.data.models || [];
        setAvailableModels(models);
        const smartModel = models.find(m => m.includes("llama3") || m.includes("mistral") || m.includes("gpt")) || models[0];
        setSelectedModel(smartModel || "");
      } catch (err) { console.error("Backend Offline"); }
      finally { setLoadingModels(false); }
    };
    fetchModels();
  }, []);

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
};

// --- BACKGROUND ENGINE (New) ---
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

  useEffect(() => {
    if (endRef.current) {
      setTimeout(() => {
        endRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }, 100);
    }
  }, [columns, isThinking]);

  // Handle Escape Key to close lesson panel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (lessonData) setLessonData(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lessonData]);

  const handleNodeClick = async (colIndex, node) => {
    if (columns[colIndex].selectedNode === node.name) return;
    if (isThinking) return;

    const newCols = columns.slice(0, colIndex + 1);
    newCols[colIndex].selectedNode = node.name;
    setColumns([...newCols]);

    setIsThinking(true);
    try {
      const contextPath = newCols.map(c => c.selectedNode).filter(Boolean).join(" > ");
      const res = await axios.post(`${BASE_URL}/expand`, {
        node: node.name,
        context: contextPath,
        model: model,
        temperature: 0.5
      });

      if (res.data.children && res.data.children.length > 0) {
        setColumns([...newCols, {
          id: node.name,
          selectedNode: null,
          nodes: res.data.children
        }]);
      } else {
          addToast("No sub-topics found.", "error");
      }
    } catch (err) {
        console.error(err);
        addToast("Failed to expand node. Try again.", "error");
    } finally { setIsThinking(false); }
  };

  const openLesson = async (nodeName, mode) => {
    setAnalyzingNode(nodeName);
    setLessonData({ content: null, mode: mode, isLoading: true });

    try {
      const contextPath = columns.map(c => c.selectedNode).filter(Boolean).join(" > ");
      const res = await axios.post(`${BASE_URL}/analyze`, {
        node: nodeName,
        context: contextPath,
        model: model,
        mode: mode
      });
      setLessonData({ content: res.data.content, mode: mode, isLoading: false });
    } catch (err) {
      setLessonData({ content: "Connection lost. Please try again.", mode: mode, isLoading: false, isError: true });
      addToast("Failed to load lesson", "error");
    }
  };

  const handleBreadcrumbClick = (index) => {
      // Keep columns up to index + 1 (the children of the clicked breadcrumb's column selection)
      if (index + 1 < columns.length) {
          setColumns(columns.slice(0, index + 2));
      }
  };

  const readingTime = lessonData && lessonData.content ? Math.ceil(lessonData.content.split(/\s+/).length / 200) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="workspace"
    >
      <header className="hud-header">
        <div className="brand" onClick={onExit} role="button" tabIndex={0} aria-label="Go to home">
          OMNI<span className="brand-thin">WEB</span>
        </div>
        <div className="breadcrumbs" aria-label="Breadcrumb">
          {columns.map((col, i) => (
             col.selectedNode && (
               <React.Fragment key={i}>
                 <span
                    className="crumb"
                    onClick={() => handleBreadcrumbClick(i)}
                    style={{cursor: 'pointer'}}
                    title="Navigate to this level"
                    role="button"
                    tabIndex={0}
                 >
                    {col.selectedNode}
                 </span>
                 <span className="sep">/</span>
               </React.Fragment>
             )
          ))}
        </div>
        <button className="exit-icon-btn" onClick={onExit} title="Exit" aria-label="Exit workspace">✕</button>
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
                onClick={() => setLessonData(null)}
            />
            <motion.div
                className="lesson-panel"
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
                role="dialog"
                aria-labelledby="lesson-title"
            >
                <div className="panel-header">
                    <div className="panel-kicker">LEARNING MODULE</div>
                    <h3 id="lesson-title">{analyzingNode}</h3>
                    {!lessonData.isLoading && !lessonData.isError && <div className="panel-meta">{readingTime} MIN READ</div>}
                </div>

                <div className="panel-tabs">
                    {['explain', 'history', 'impact', 'eli5', 'quiz'].map(m => (
                        <button
                            key={m}
                            className={lessonData.mode === m ? 'active' : ''}
                            onClick={() => openLesson(analyzingNode, m)}
                            aria-selected={lessonData.mode === m}
                            role="tab"
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
                ) : lessonData.isError ? (
                     <div className="error-message">
                         <p style={{color: '#f87171'}}>{lessonData.content}</p>
                         <button
                            onClick={() => openLesson(analyzingNode, lessonData.mode)}
                            style={{marginTop: 20, padding: '10px 20px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'}}
                         >Retry</button>
                     </div>
                ) : (
                    <ReactMarkdown components={{
                        blockquote: ({node, ...props}) => <div className="quote-box" {...props} />
                    }}>
                        {lessonData.content}
                    </ReactMarkdown>
                )}
                </div>

                <div className="panel-footer">
                    <button onClick={() => {
                        navigator.clipboard.writeText(lessonData.content);
                        addToast("Lesson text copied to clipboard", "success");
                    }}>COPY TEXT</button>
                    <button onClick={() => setLessonData(null)}>CLOSE</button>
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
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') onClick(); }}
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
            <ActionButton label="Explain" onClick={() => onAction('explain')} />
            <ActionButton label="History" onClick={() => onAction('history')} />
            <ActionButton label="Impact" onClick={() => onAction('impact')} />
            <ActionButton label="ELI5" onClick={() => onAction('eli5')} />
            <ActionButton label="Quiz" onClick={() => onAction('quiz')} />
          </motion.div>
        )}
      </AnimatePresence>

      {isActive && <motion.div layoutId="activeGlow" className="active-glow" />}
    </motion.div>
  );
};

const ActionButton = ({ label, onClick }) => (
    <button className="action-btn" onClick={(e) => { e.stopPropagation(); onClick(); }} aria-label={label}>
        {label}
    </button>
);

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

const LandingInterface = ({ models, selected, onSelect, onStart, isLoading, startTopic, setStartTopic }) => (
  <motion.div
    className="landing-container"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
  >
    <div className="landing-content">
      <motion.h1
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.8 }}
        className="hero-title"
      >
        Omni<span className="accent">Web</span>
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}
        className="hero-subtitle"
      >
        The Infinite Learning Engine
      </motion.p>

      <motion.div
        className="search-wrapper"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5 }}
      >
        <input
            type="text"
            value={startTopic}
            onChange={(e) => setStartTopic(e.target.value)}
            placeholder="Search any topic (e.g., Black Holes, Jazz)..."
            onKeyDown={(e) => e.key === 'Enter' && startTopic.trim() && onStart()}
            autoFocus
            aria-label="Search topic"
        />
        <button onClick={onStart} disabled={isLoading || !startTopic.trim()} className="go-btn" aria-label="Start">
             ➜
        </button>
      </motion.div>

      <motion.div
         initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
         className="landing-footer"
      >
         {isLoading ? (
             <span className="status-connecting">INITIALIZING SYSTEM...</span>
         ) : (
             <div className="model-selector-pill">
                 <span className="dot online"></span>
                 <select value={selected} onChange={(e) => onSelect(e.target.value)} aria-label="Select AI Model">
                    {models.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                 </select>
             </div>
         )}
      </motion.div>
    </div>
  </motion.div>
);

export default App;
