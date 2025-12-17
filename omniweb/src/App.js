import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

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
      <GlobalCSS />
    </div>
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

      // Gather recent nodes (current level + previous level)
      const recentNodes = [];
      if (columns[colIndex]) {
        columns[colIndex].nodes.forEach(n => recentNodes.push(n.name));
      }
      if (colIndex > 0 && columns[colIndex - 1]) {
        columns[colIndex - 1].nodes.forEach(n => recentNodes.push(n.name));
      }

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
      setLessonData({ content: "Connection lost.", mode: mode, isLoading: false });
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
                onClick={() => setLessonData(null)}
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
        />
        <button onClick={onStart} disabled={isLoading || !startTopic.trim()} className="go-btn">
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
                 <select value={selected} onChange={(e) => onSelect(e.target.value)}>
                    {models.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                 </select>
             </div>
         )}
      </motion.div>
    </div>
  </motion.div>
);

// --- CSS STYLES ---

const GlobalCSS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,600;1,400&display=swap');

    :root {
      --bg-dark: #08080b;
      --glass-border: rgba(255, 255, 255, 0.06);
      --primary: #8b5cf6; /* Soft Violet */
      --secondary: #06b6d4; /* Cyan */
      --text: #ffffff;
      --text-muted: #9ca3af;
      --col-width: 440px;
    }

    body { margin: 0; background: var(--bg-dark); color: var(--text); font-family: 'Inter', sans-serif; overflow: hidden; }

    /* BACKGROUND ENGINE */
    .bg-engine { position: fixed; inset: 0; z-index: -1; overflow: hidden; background: #050507; }

    .orb { position: absolute; border-radius: 50%; filter: blur(100px); opacity: 0.4; animation: float 20s infinite ease-in-out; }
    .orb-1 { top: -10%; left: -10%; width: 50vw; height: 50vw; background: radial-gradient(circle, #4c1d95 0%, transparent 70%); animation-delay: 0s; }
    .orb-2 { bottom: -20%; right: -10%; width: 60vw; height: 60vw; background: radial-gradient(circle, #0e7490 0%, transparent 70%); animation-delay: -5s; }
    .orb-3 { top: 40%; left: 40%; width: 40vw; height: 40vw; background: radial-gradient(circle, #be185d 0%, transparent 70%); opacity: 0.2; animation-delay: -10s; }

    .bg-noise {
        position: fixed; inset: 0; opacity: 0.03; pointer-events: none;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    }

    @keyframes float {
        0%, 100% { transform: translate(0, 0); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
    }

    /* LANDING */
    .landing-container { height: 100vh; display: flex; justify-content: center; align-items: center; position: relative; z-index: 10; }
    .landing-content { text-align: center; width: 100%; max-width: 650px; padding: 20px; }

    .hero-title { font-family: 'Playfair Display', serif; font-size: 80px; margin: 0; font-weight: 600; color: #fff; letter-spacing: -2px; }
    .accent { background: linear-gradient(135deg, #a78bfa, #22d3ee); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-style: italic; }
    .hero-subtitle { font-size: 18px; color: var(--text-muted); margin-bottom: 50px; font-weight: 300; letter-spacing: 0.5px; }

    .search-wrapper {
        position: relative; background: rgba(255,255,255,0.03); padding: 6px; border-radius: 100px;
        border: 1px solid var(--glass-border); display: flex; transition: all 0.3s; backdrop-filter: blur(10px);
    }
    .search-wrapper:focus-within { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
    .search-wrapper input { flex: 1; background: transparent; border: none; padding: 18px 30px; font-size: 18px; color: #fff; font-family: 'Inter'; outline: none; }
    .go-btn { width: 54px; height: 54px; border-radius: 50%; border: none; background: #fff; color: #000; font-size: 20px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
    .go-btn:hover { transform: scale(1.05); background: #e0e7ff; }

    .landing-footer { margin-top: 40px; }
    .model-selector-pill { display: inline-flex; align-items: center; background: rgba(255,255,255,0.05); padding: 8px 16px; border-radius: 20px; border: 1px solid var(--glass-border); gap: 10px; backdrop-filter: blur(5px); }
    .model-selector-pill select { background: transparent; border: none; color: var(--text-muted); outline: none; cursor: pointer; font-size: 13px; font-family: 'Inter'; }
    .dot.online { width: 6px; height: 6px; background: #34d399; border-radius: 50%; box-shadow: 0 0 8px #34d399; }

    /* HEADER */
    .hud-header { height: 70px; display: flex; align-items: center; padding: 0 30px; border-bottom: 1px solid var(--glass-border); background: rgba(8, 8, 11, 0.6); backdrop-filter: blur(20px); z-index: 10; justify-content: space-between; }
    .brand { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 600; cursor: pointer; letter-spacing: -0.5px; }
    .brand-thin { font-family: 'Inter', sans-serif; font-weight: 300; opacity: 0.7; font-size: 20px; }
    .breadcrumbs { flex: 1; margin: 0 40px; display: flex; gap: 8px; overflow: hidden; white-space: nowrap; mask-image: linear-gradient(90deg, #000 80%, transparent 100%); font-size: 13px; color: var(--text-muted); }
    .crumb { color: #fff; font-weight: 500; }
    .exit-icon-btn { background: none; border: 1px solid var(--glass-border); color: var(--text-muted); width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
    .exit-icon-btn:hover { background: #fff; color: #000; }

    /* COLUMNS */
    .miller-columns-container { flex: 1; display: flex; overflow-x: auto; padding: 30px 40px; gap: 24px; }
    .miller-columns-container::-webkit-scrollbar { height: 6px; }
    .miller-columns-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

    .column { min-width: var(--col-width); width: var(--col-width); display: flex; flex-direction: column; }
    .column-header { font-size: 10px; font-weight: 700; color: var(--text-muted); margin-bottom: 16px; letter-spacing: 1.5px; opacity: 0.6; }
    .node-list { display: flex; flex-direction: column; gap: 12px; padding-bottom: 50px; }

    /* NODE CARDS */
    .node-card {
        background: rgba(255,255,255,0.02);
        border: 1px solid var(--glass-border);
        border-radius: 12px;
        padding: 24px;
        position: relative; overflow: hidden;
        cursor: pointer;
        transition: background 0.3s, border-color 0.3s;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .node-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.15); }
    .node-card.active { background: rgba(139, 92, 246, 0.08); border-color: rgba(139, 92, 246, 0.4); }

    .node-content { position: relative; z-index: 2; }
    .node-name { font-size: 20px; font-weight: 500; margin-bottom: 6px; color: #fff; letter-spacing: -0.3px; }
    .node-desc { font-size: 15px; color: var(--text-muted); line-height: 1.5; font-weight: 300; }

    .node-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 24px; position: relative; z-index: 2; }
    .node-actions .action-btn:last-child { grid-column: span 2; }

    .action-btn {
        display: flex; align-items: center; justify-content: center; gap: 10px;
        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
        color: var(--text-muted); padding: 12px 0; border-radius: 10px;
        font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;
        cursor: pointer; transition: all 0.2s ease;
        backdrop-filter: blur(5px);
    }
    .action-btn:hover {
        background: rgba(255,255,255,0.1);
        border-color: rgba(255,255,255,0.2);
        color: #fff;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .action-btn:active { transform: translateY(0); }

    .btn-icon { display: flex; align-items: center; opacity: 0.7; }
    .action-btn:hover .btn-icon { opacity: 1; color: var(--primary); }

    .active-glow {
        position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: var(--primary);
        box-shadow: 2px 0 20px var(--primary); z-index: 1;
    }

    /* LESSON PANEL */
    .lesson-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); z-index: 90; }
    .lesson-panel {
        position: fixed; top: 0; right: 0; bottom: 0; width: 680px;
        background: #09090b; border-left: 1px solid var(--glass-border); z-index: 100;
        display: flex; flex-direction: column;
        box-shadow: -20px 0 60px rgba(0,0,0,0.5);
    }
    .panel-header { padding: 50px 50px 20px 50px; }
    .panel-kicker { font-size: 11px; font-weight: 700; color: var(--secondary); letter-spacing: 2px; margin-bottom: 12px; text-transform: uppercase; }
    .panel-header h3 { font-family: 'Playfair Display', serif; font-size: 42px; margin: 0; color: #fff; line-height: 1.1; letter-spacing: -0.5px; }

    /* --- CONFLICT RESOLVED HERE --- */
    .panel-meta { font-size: 10px; color: var(--text-muted); letter-spacing: 1px; margin-top: 5px; }

    .panel-tabs { display: flex; padding: 0 50px; border-bottom: 1px solid var(--glass-border); gap: 30px; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
    .panel-tabs::-webkit-scrollbar { display: none; }
    /* ------------------------------ */

    .panel-tabs button {
        background: none; border: none; padding: 20px 0; color: var(--text-muted);
        font-size: 11px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; letter-spacing: 1px;
        transition: 0.2s;
    }
    .panel-tabs button:hover { color: #fff; }
    .panel-tabs button.active { color: var(--primary); border-bottom-color: var(--primary); }

    .panel-content { padding: 50px; overflow-y: auto; color: #d1d5db; font-size: 18px; line-height: 1.8; font-family: 'Playfair Display', serif; }
    .panel-content h1, .panel-content h2, .panel-content h3 { font-family: 'Inter', sans-serif; color: #fff; margin-top: 30px; letter-spacing: -0.5px; }
    .panel-content strong { color: #fff; font-weight: 600; }

    .quote-box {
        background: rgba(139, 92, 246, 0.05); border-left: 3px solid var(--primary);
        padding: 24px; margin: 30px 0; font-style: italic; color: #e5e7eb; border-radius: 0 8px 8px 0;
    }

    .panel-footer { padding: 20px 50px; border-top: 1px solid var(--glass-border); display: flex; justify-content: flex-end; gap: 12px; background: rgba(0,0,0,0.3); }
    .panel-footer button {
        background: transparent; border: 1px solid var(--glass-border); color: var(--text-muted);
        padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 12px; transition: 0.2s;
    }
    .panel-footer button:hover { background: #fff; color: #000; border-color: #fff; }

    /* LOADING SKELETONS */
    .skeleton-card { pointer-events: none; }
    .sk-line { background: rgba(255,255,255,0.08); border-radius: 4px; animation: pulse 1.5s infinite ease-in-out; }
    .w-100 { width: 100%; } .w-75 { width: 75%; } .w-50 { width: 50%; }
    @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 0.6; } 100% { opacity: 0.3; } }

    /* TOASTS */
    .toast-container {
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        display: flex; flex-direction: column; gap: 10px; z-index: 200; pointer-events: none;
    }
    .toast {
        background: rgba(20, 20, 25, 0.9); border: 1px solid var(--glass-border);
        padding: 12px 24px; border-radius: 50px; color: #fff; font-size: 13px; font-weight: 500;
        backdrop-filter: blur(10px); box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        display: flex; align-items: center; gap: 10px; pointer-events: auto;
    }
    .toast.success { border-color: #34d399; color: #34d399; }
    .toast.error { border-color: #f87171; color: #f87171; }
  `}</style>
);

export default App;
