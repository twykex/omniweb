import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { HistoryTimeline } from "./HistoryTimeline";

const BASE_URL = "http://localhost:8000";

// Suggested topics from Main branch
const SUGGESTED_TOPICS = ["Neural Networks", "The Renaissance", "Mars Colonization", "Jazz History"];

// --- HELPERS ---

// Converts "[Image of X]" tags into Markdown images with a generation URL
const processAutoDiagrams = (text) => {
  if (!text) return "";
  const regex = /\[Image of (.*?)\]/g;
  return text.replace(regex, (match, query) => {
    // We append specific keywords to ensure the AI generator creates a diagram style image
    const prompt = encodeURIComponent(`educational scientific diagram schematic white on black background: ${query}`);
    const url = `https://image.pollinations.ai/prompt/${prompt}?width=800&height=450&nologo=true&seed=${query.length}`;
    return `\n\n![${query}](${url})\n\n`;
  });
};

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

  const handleSurprise = async () => {
    if (!selectedModel) return;
    setLoadingModels(true);
    try {
        const res = await axios.post(`${BASE_URL}/random`, { model: selectedModel });
        if (res.data.topic) {
            setStartTopic(res.data.topic);
            setHasStarted(true);
        }
    } catch (err) {
        console.error(err);
        addToast("Failed to generate random topic", "error");
    } finally {
        setLoadingModels(false);
    }
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
            onSurprise={handleSurprise}
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
      <GlobalCSS />
    </div>
  );
};

// --- BACKGROUND ENGINE ---
const BackgroundEngine = () => (
  <div className="bg-engine">
    <div className="orb orb-1"></div>
    <div className="orb orb-2"></div>
    <div className="orb orb-3"></div>
    <div className="orb orb-4"></div>
    <div className="bg-noise"></div>
  </div>
);

// --- WORKSPACE COMPONENT ---
const LearningWorkspace = ({ model, initialTopic, onExit, addToast }) => {
  const [columns, setColumns] = useState([{ 
    id: "root", 
    selectedNode: null, 
    nodes: [{ name: initialTopic, desc: "The starting point of your journey.", status: "concept" }],
    seenNodes: [initialTopic]
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
        if (endRef.current.scrollIntoView) {
            endRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
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
      
      // Send recent nodes to avoid duplicates
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
          nodes: res.data.children,
          seenNodes: res.data.children.map(c => c.name)
        }]);
      } else {
        addToast("Could not expand this topic. Try again.", "warning");
      }
    } catch (err) {
        console.error(err);
        addToast("Failed to expand node", "error");
    } finally { setIsThinking(false); }
  };

  const handleRegenerate = async (colIndex) => {
    if (isThinking) return;
    if (colIndex === 0) return;

    const col = columns[colIndex];
    const parentNodeName = col.id;
    const parentCols = columns.slice(0, colIndex);
    const contextPath = parentCols.map(c => c.selectedNode).filter(Boolean).join(" > ");

    const currentSeen = col.seenNodes || col.nodes.map(n => n.name);
    const parentSiblings = columns[colIndex - 1].nodes.map(n => n.name);
    // Explicitly aggregate all seen nodes to ensure backend avoids reusing them
    const avoidList = [...new Set([...currentSeen, ...parentSiblings, parentNodeName])];

    setIsThinking(true);
    try {
        const res = await axios.post(`${BASE_URL}/expand`, {
            node: parentNodeName,
            context: contextPath,
            model: model,
            temperature: 0.7,
            recent_nodes: avoidList
        });

        if (res.data.children && res.data.children.length > 0) {
            // Truncate future columns as we are changing the current level's nodes
            const newCols = columns.slice(0, colIndex + 1);
            newCols[colIndex] = {
                ...col,
                selectedNode: null, // Clear selection as the node might be gone
                nodes: res.data.children,
                seenNodes: [...currentSeen, ...res.data.children.map(c => c.name)]
            };
            setColumns(newCols);
            addToast("Regenerated level!", "success");
        } else {
             addToast("No new unique topics found.", "warning");
        }
    } catch (err) {
        console.error(err);
        addToast("Regeneration failed", "error");
    } finally {
        setIsThinking(false);
    }
  };

  const openLesson = async (nodeName, mode, quizConfig = null) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setAnalyzingNode(nodeName);

    if (mode === 'quiz' && !quizConfig) {
        setLessonData({ mode: 'quiz', stage: 'config' });
        return;
    }

    setLessonData({ content: "", mode: mode, isLoading: true, stage: 'loading', quizConfig });

    try {
      const contextPath = columns.map(c => c.selectedNode).filter(Boolean).join(" > ");
      
      const response = await fetch(`${BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node: nodeName,
          context: contextPath,
          model: model,
          mode: mode,
          difficulty: quizConfig?.difficulty,
          num_questions: quizConfig?.numQuestions
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
              isLoading: mode === 'history' ? true : false
            };
          });
        }
      }
      setLessonData(prev => prev ? { ...prev, isLoading: false, isComplete: true } : null);

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

  const jumpToLevel = (index) => {
    if (isThinking) return;
    if (index === columns.length - 1) return;

    const newCols = columns.slice(0, index + 1);
    newCols[index] = { ...newCols[index], selectedNode: null };
    setColumns(newCols);
  };

  const readingTime = lessonData && lessonData.content && lessonData.content.trim() ? Math.ceil(lessonData.content.split(/\s+/).length / 200) : 0;

  // Process content to find  tags and convert to visual markdown
  const processedContent = useMemo(() => {
    return processAutoDiagrams(lessonData?.content || "");
  }, [lessonData?.content]);

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
              {colIdx > 0 && (
                <button
                  className="regenerate-btn"
                  onClick={() => handleRegenerate(colIdx)}
                  title="Regenerate with new topics (avoids duplicates)"
                  data-testid="regenerate-btn"
                >
                   ↻ REGENERATE
                </button>
              )}
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

      <TimelineBar columns={columns} onJump={jumpToLevel} />

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
                    {['explain', 'history', 'impact', 'eli5', 'future', 'code', 'proscons', 'debate', 'quiz'].map(m => (
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
                {lessonData.stage === 'config' ? (
                    <QuizConfig onStart={(cfg) => openLesson(analyzingNode, 'quiz', cfg)} />
                ) : (lessonData.isLoading || (lessonData.mode === 'quiz' && !lessonData.isComplete) ? (
                    <div className="text-skeleton">
                        <div className="sk-line w-75"></div>
                        <div className="sk-line w-100"></div>
                        <div className="sk-line w-100"></div>
                        <div className="sk-line w-50"></div>
                        <br/>
                        <div className="sk-line w-100"></div>
                        <div className="sk-line w-75"></div>
                        {lessonData.mode === 'quiz' && <div style={{textAlign: 'center', marginTop: 20, color: 'var(--secondary)', fontWeight: 'bold', fontSize: '12px', letterSpacing: '1px'}}>GENERATING QUIZ ({lessonData.quizConfig?.difficulty || 'medium'})...</div>}
                    </div>
                ) : lessonData.mode === 'history' ? (
                    <HistoryTimeline jsonString={processedContent} />
                ) : (
                    lessonData.mode === 'quiz' ? (
                        <QuizInterface
                            content={lessonData.content}
                            quizConfig={lessonData.quizConfig}
                            onNewQuiz={() => openLesson(analyzingNode, 'quiz', lessonData.quizConfig)}
                        />
                    ) : (
                    <ReactMarkdown components={{
                        blockquote: ({node, ...props}) => <div className="quote-box" {...props} />,
                        // Custom renderer for images to act as diagrams
                        img: ({src, alt}) => <DiagramWidget src={src} title={alt} />
                    }}>
                        {processedContent}
                    </ReactMarkdown>
                    )
                ))}
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

const DiagramWidget = ({ src, title }) => {
    const [loaded, setLoaded] = useState(false);
    
    return (
        <div className="diagram-widget">
            <div className="dw-header">
                <span className="dw-icon">⎔</span>
                <span className="dw-title">GENERATED DIAGRAM: {title.toUpperCase()}</span>
            </div>
            <div className="dw-frame">
                {!loaded && (
                    <div className="dw-loader">
                        <div className="spinner"></div>
                        <span>Rendering Schematic...</span>
                    </div>
                )}
                <img 
                    src={src} 
                    alt={title} 
                    className="dw-image" 
                    style={{ opacity: loaded ? 1 : 0 }}
                    onLoad={() => setLoaded(true)}
                />
            </div>
        </div>
    );
};

const TimelineBar = ({ columns, onJump }) => {
  return (
    <div className="timeline-wrapper">
      <motion.div
        className="timeline-container"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 15 }}
      >
        <div className="timeline-track custom-scroll">
          {columns.map((col, i) => {
            const isLast = i === columns.length - 1;
            const label = i === 0 ? "HOME" : columns[i - 1].selectedNode;

            return (
              <React.Fragment key={i}>
                <motion.div
                  className={`timeline-node ${isLast ? 'current' : 'past'}`}
                  onClick={() => onJump(i)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={isLast ? "Current View" : `Jump to ${label}`}
                >
                  <div className="t-dot">
                      {i === 0 ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                      ) : (
                        <span>{i + 1}</span>
                      )}
                      {isLast && <motion.div layoutId="pulse" className="t-pulse" />}
                  </div>
                  <div className="t-info">
                    <span className="t-label">{label}</span>
                  </div>
                </motion.div>
                {!isLast && <div className="t-connector" />}
              </React.Fragment>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

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
            <ActionButton icon={<Icons.Future />} label="Future" onClick={() => onAction('future')} />
            <ActionButton icon={<Icons.Code />} label="Code" onClick={() => onAction('code')} />
            <ActionButton icon={<Icons.ProsCons />} label="Pros/Cons" onClick={() => onAction('proscons')} />
            <ActionButton icon={<Icons.Debate />} label="Debate" onClick={() => onAction('debate')} />
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
  Future: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
    </svg>
  ),
  Code: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
  ),
  ProsCons: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20v-8m0 0V4m0 8h8m-8 0H4"></path>
    </svg>
  ),
  Debate: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
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

const QuizConfig = ({ onStart }) => {
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState(5);

  return (
    <div className="quiz-config">
      <h3>Configure Quiz</h3>
      <div className="config-grid">
          <div className="config-item">
            <label>Difficulty</label>
            <div className="segmented-control">
              {['easy', 'medium', 'hard'].map(d => (
                <button
                  key={d}
                  className={difficulty === d ? 'active' : ''}
                  onClick={() => setDifficulty(d)}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="config-item">
            <label>Questions: {numQuestions}</label>
            <input 
              type="range" min="3" max="10" step="1"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
              className="range-slider"
            />
          </div>
      </div>

      <button className="start-quiz-btn" onClick={() => onStart({ difficulty, numQuestions })}>
        START QUIZ
      </button>
    </div>
  );
};

const QuizInterface = ({ content, quizConfig, onNewQuiz }) => {
  const [quizData, setQuizData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [parseError, setParseError] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);

  // New State
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    try {
      let jsonStr = content.trim();
      jsonStr = jsonStr.replace(/```json/gi, "").replace(/```/g, "");
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}') + 1;
      if (start !== -1 && end !== -1) {
          jsonStr = jsonStr.substring(start, end);
          const data = JSON.parse(jsonStr);
          if (data && data.questions) {
              setQuizData(data);
          } else {
              setParseError(true);
          }
      } else {
           setParseError(true);
      }
    } catch (e) {
      console.error("Quiz parse error", e);
      setParseError(true);
    }
  }, [content]);

  // Timer Effect
  useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0 && !showResult && !quizFinished) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      handleOptionClick(-1); // Timeout
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, showResult, quizFinished]);

  // Start timer when question changes
  useEffect(() => {
    if (quizData && !showResult && !quizFinished) {
        setTimeLeft(30);
        setTimerActive(true);
    }
  }, [currentQuestion, quizData, showResult, quizFinished]);

  const handleOptionClick = (index) => {
    if (selectedOption !== null && index !== -1) return; // Prevent clicks after selection, allow timeout

    setTimerActive(false);
    setSelectedOption(index);

    let isCorrect = false;
    if (index !== -1) {
        isCorrect = index === quizData.questions[currentQuestion].correct_index;
    }

    if (isCorrect) {
        setScore(score + 1);
        setStreak(streak + 1);
    } else {
        setStreak(0);
    }
    setUserAnswers([...userAnswers, { questionIndex: currentQuestion, selected: index, correct: isCorrect, timeOut: index === -1 }]);
    setShowResult(true);
  };

  const nextQuestion = () => {
    setSelectedOption(null);
    setShowResult(false);
    if (currentQuestion + 1 < quizData.questions.length) {
        setCurrentQuestion(currentQuestion + 1);
    } else {
        setQuizFinished(true);
    }
  };

  if (parseError) {
      return (
        <div className="quiz-error">
            <h3>⚠️ Unable to load quiz</h3>
            <p>The neural network failed to generate a valid quiz format.</p>
            <div className="raw-content">
                <small>Raw output:</small>
                <pre>{content}</pre>
            </div>
        </div>
      );
  }

  if (!quizData) return <div className="quiz-loading">Loading Quiz...</div>;

  if (quizFinished) {
      const percentage = Math.round((score / quizData.questions.length) * 100);
      return (
          <div className="quiz-results">
              <h3>Quiz Completed!</h3>
              <div className="score-circle" style={{ borderColor: percentage >= 70 ? '#34d399' : '#f87171' }}>
                  <span className="score-num">{percentage}%</span>
              </div>
              <p>You got {score} out of {quizData.questions.length} correct.</p>
              
              <div className="results-review">
                  <h4>Review</h4>
                  {quizData.questions.map((q, i) => {
                      const ans = userAnswers.find(a => a.questionIndex === i);
                      return (
                          <div key={i} className={`review-item ${ans?.correct ? 'correct' : 'wrong'}`}>
                              <div className="review-q">{i+1}. {q.question}</div>
                              <div className="review-ans">
                                  {ans?.correct ? (
                                      <span style={{color:'#34d399'}}>✓ Correct</span>
                                  ) : (
                                      <>
                                          <span style={{color:'#f87171'}}>
                                            {ans?.timeOut ? '⏱️ Timed Out' : `✗ You chose: ${q.options[ans?.selected]}`}
                                          </span>
                                          <br/>
                                          <span style={{color:'#34d399'}}>✓ Correct: {q.options[q.correct_index]}</span>
                                      </>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>

              <div className="quiz-actions" style={{marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center'}}>
                <button onClick={() => {
                    setScore(0);
                    setCurrentQuestion(0);
                    setQuizFinished(false);
                    setSelectedOption(null);
                    setShowResult(false);
                    setUserAnswers([]);
                    setStreak(0);
                }} className="retry-btn">RETRY SAME QUESTIONS</button>

                <button onClick={onNewQuiz} className="retry-btn" style={{background: 'rgba(139, 92, 246, 0.2)', borderColor: 'rgba(139, 92, 246, 0.5)'}}>
                    GENERATE NEW QUIZ
                </button>
              </div>
          </div>
      );
  }

  const question = quizData.questions[currentQuestion];

  return (
      <div className="quiz-container">
          <div className="quiz-header">
             <div className="streak-badge">
                🔥 {streak}
             </div>
             <div className="timer-track">
                <div
                    className={`timer-fill ${timeLeft < 10 ? 'danger' : ''}`}
                    style={{width: `${(timeLeft / 30) * 100}%`}}
                ></div>
             </div>
             <div className="timer-text">{timeLeft}s</div>
          </div>

          <div className="quiz-progress-bar">
              <div className="progress-fill" style={{width: `${((currentQuestion) / quizData.questions.length) * 100}%`}}></div>
          </div>
          <div className="quiz-progress-text">
              Question {currentQuestion + 1} of {quizData.questions.length}
          </div>

          <AnimatePresence mode="wait">
            <motion.div 
                key={currentQuestion}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
            >
                <h3 className="quiz-question">{question.question}</h3>
                <div className="quiz-options">
                    {question.options.map((opt, idx) => (
                        <button 
                            key={idx}
                            className={`quiz-option ${selectedOption === idx ? (idx === question.correct_index ? 'correct' : 'wrong') : ''} ${showResult && idx === question.correct_index ? 'correct' : ''}`}
                            onClick={() => handleOptionClick(idx)}
                            disabled={selectedOption !== null}
                        >
                            <span className="opt-letter">{String.fromCharCode(65+idx)}</span>
                            {opt}
                            {selectedOption === idx && (idx === question.correct_index ? ' ✓' : ' ✗')}
                        </button>
                    ))}
                </div>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {showResult && (
                <motion.div
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="quiz-explanation"
                >
                    <strong>Explanation:</strong> {question.explanation}
                    <button className="next-btn" onClick={nextQuestion}>
                        {currentQuestion + 1 < quizData.questions.length ? "Next Question" : "See Results"}
                    </button>
                </motion.div>
            )}
          </AnimatePresence>
      </div>
  );
};

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

const LandingInterface = ({ models, selected, onSelect, onStart, isLoading, startTopic, setStartTopic, backendError, onRetry, onSurprise }) => {
  const inputRef = useRef(null);

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
          <button onClick={onStart} disabled={isLoading || backendError || !startTopic.trim()} className="go-btn">
                ➜
          </button>
        </motion.div>

        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            style={{ marginBottom: 20 }}
        >
            <button
                onClick={onSurprise}
                className="surprise-btn"
                disabled={isLoading || backendError}
            >
                🎲 SURPRISE ME
            </button>
        </motion.div>

        {/* Re-integrated Suggested Topics from Main */}
        <motion.div 
          className="suggested-topics"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        >
          <span>Try:</span>
          {SUGGESTED_TOPICS.map(topic => (
            <button 
              key={topic} 
              className="topic-tag"
              onClick={() => {
                setStartTopic(topic);
                inputRef.current?.focus();
              }}
            >
              {topic}
            </button>
          ))}
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
      </div>
    </motion.div>
  );
};

// --- CSS STYLES ---

const GlobalCSS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,600;1,400&display=swap');

    :root {
      --bg-dark: #030305; /* Deepest Void */
      --glass-border: rgba(255, 255, 255, 0.08);
      --primary: #a78bfa; /* Lighter, glowing violet */
      --primary-glow: rgba(167, 139, 250, 0.4);
      --secondary: #22d3ee; /* Bright Cyan */
      --secondary-glow: rgba(34, 211, 238, 0.4);
      --text: #ffffff;
      --text-muted: #94a3b8; /* Slate 400 */
      --col-width: 440px;
    }

    body { margin: 0; background: var(--bg-dark); color: var(--text); font-family: 'Inter', sans-serif; overflow: hidden; }

    /* ACCESSIBILITY */
    *:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
    }

    /* BACKGROUND ENGINE */
    .bg-engine { position: fixed; inset: 0; z-index: -1; overflow: hidden; background: #030305; }

    .orb { position: absolute; border-radius: 50%; filter: blur(80px); animation: float 25s infinite ease-in-out; mix-blend-mode: screen; }
    
    .orb-1 { top: -10%; left: -10%; width: 60vw; height: 60vw; background: radial-gradient(circle, #4c1d95 0%, transparent 60%); animation-delay: 0s; opacity: 0.5; }
    .orb-2 { bottom: -20%; right: -10%; width: 70vw; height: 70vw; background: radial-gradient(circle, #083344 0%, transparent 60%); animation-delay: -5s; opacity: 0.6; }
    .orb-3 { top: 30%; left: 40%; width: 45vw; height: 45vw; background: radial-gradient(circle, #be185d 0%, transparent 60%); opacity: 0.3; animation-delay: -10s; }
    .orb-4 { bottom: 20%; left: 10%; width: 30vw; height: 30vw; background: radial-gradient(circle, #059669 0%, transparent 60%); opacity: 0.2; animation-delay: -15s; }
    
    .bg-noise {
        position: fixed; inset: 0; opacity: 0.035; pointer-events: none;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    }

    @keyframes float {
        0%, 100% { transform: translate(0, 0) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.95); }
    }

    /* LANDING */
    .landing-container { 
        height: 100vh; 
        width: 100%; 
        overflow-y: auto; 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        position: relative; 
        z-index: 10; 
        padding: 40px 20px;
        box-sizing: border-box;
    }
    .landing-content { 
        margin: auto; 
        text-align: center; 
        width: 100%; 
        max-width: 900px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .hero-title {
        font-family: 'Playfair Display', serif; font-size: 80px; margin: 0; font-weight: 600; color: #fff; letter-spacing: -2px;
        text-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .accent { background: linear-gradient(135deg, #c4b5fd, #67e8f9); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-style: italic; }
    .hero-subtitle { font-size: 18px; color: var(--text-muted); margin-bottom: 40px; font-weight: 300; letter-spacing: 0.5px; line-height: 1.6; max-width: 600px; }

    .search-wrapper { 
        width: 100%; max-width: 600px;
        position: relative; background: rgba(255,255,255,0.03); padding: 6px; border-radius: 100px;
        border: 1px solid var(--glass-border); display: flex; transition: all 0.3s; backdrop-filter: blur(10px);
        box-shadow: 0 4px 30px rgba(0,0,0,0.1);
    }
    .search-wrapper:focus-within {
        background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.25);
        box-shadow: 0 10px 40px rgba(0,0,0,0.4), 0 0 0 2px rgba(167, 139, 250, 0.2);
    }
    .search-wrapper input { flex: 1; background: transparent; border: none; padding: 18px 30px; font-size: 18px; color: #fff; font-family: 'Inter'; outline: none; font-weight: 300; }
    .go-btn { width: 54px; height: 54px; border-radius: 50%; border: none; background: #fff; color: #000; font-size: 20px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(255,255,255,0.2); }
    .go-btn:hover { transform: scale(1.05); background: #f8fafc; }

    .landing-footer { margin-top: 30px; margin-bottom: 60px; }
    .dot.online { width: 6px; height: 6px; background: #34d399; border-radius: 50%; box-shadow: 0 0 8px #34d399; }

    .kicker { font-size: 11px; font-weight: 700; letter-spacing: 3px; color: var(--secondary); margin-bottom: 30px; text-transform: uppercase; opacity: 0.8; }

    .features-grid { 
        display: grid; 
        grid-template-columns: repeat(1, 1fr); 
        gap: 20px; 
        width: 100%; 
    }
    @media (min-width: 640px) { .features-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1024px) { .features-grid { grid-template-columns: repeat(4, 1fr); } }

    .feature-card { 
        background: rgba(255, 255, 255, 0.02); 
        border: 1px solid var(--glass-border); 
        border-radius: 16px; 
        padding: 24px 20px; 
        text-align: left; 
        transition: transform 0.3s, background 0.3s; 
        position: relative;
        overflow: hidden;
    }
    .feature-card::before {
        content: ''; position: absolute; inset: 0;
        background: radial-gradient(circle at top right, rgba(255,255,255,0.05), transparent 70%);
        opacity: 0; transition: opacity 0.3s; pointer-events: none;
    }
    .feature-card:hover { 
        background: rgba(255, 255, 255, 0.04);
        transform: translateY(-5px); 
        border-color: rgba(255, 255, 255, 0.15); 
    }
    .feature-card:hover::before { opacity: 1; }

    .feature-icon { font-size: 28px; margin-bottom: 16px; filter: drop-shadow(0 0 10px rgba(255,255,255,0.2)); }
    .feature-card h3 { color: #fff; font-size: 16px; margin: 0 0 8px 0; font-weight: 600; letter-spacing: -0.2px; }
    .feature-card p { color: var(--text-muted); font-size: 13px; margin: 0; line-height: 1.6; }

    .suggested-topics {
        margin-top: 24px;
        display: flex; gap: 12px; justify-content: center; align-items: center; flex-wrap: wrap;
        font-size: 14px; color: var(--text-muted);
    }
    .topic-tag {
        background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border);
        padding: 8px 16px; border-radius: 20px; color: var(--text-muted);
        cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif;
        font-size: 12px; font-weight: 500; letter-spacing: 0.5px;
    }
    .topic-tag:hover {
        background: rgba(167, 139, 250, 0.15); color: #fff; border-color: rgba(167, 139, 250, 0.4);
        transform: translateY(-2px);
    }

    .error-state { display: flex; flex-direction: column; align-items: center; gap: 12px; animation: fadeIn 0.5s ease; }
    .error-msg { color: #f87171; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; }
    .retry-btn { 
        background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); 
        color: #fff; padding: 8px 16px; border-radius: 6px; cursor: pointer; 
        font-size: 11px; font-weight: 600; transition: 0.2s; 
    }
    .retry-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
    .error-hint { font-size: 11px; color: var(--text-muted); opacity: 0.7; }
    .error-hint code { background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; font-family: monospace; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .surprise-btn {
        background: transparent; border: 1px solid var(--glass-border); color: var(--text-muted);
        padding: 10px 24px; border-radius: 50px; cursor: pointer; font-size: 12px; font-weight: 600;
        letter-spacing: 1px; transition: 0.2s;
    }
    .surprise-btn:hover {
        background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.2);
    }

    /* MODEL SELECTOR */
    .model-selector-container { position: relative; width: 280px; text-align: left; margin: 0 auto; }
    .model-selector-trigger {
        background: rgba(255,255,255,0.05); padding: 12px 20px; border-radius: 12px; 
        border: 1px solid var(--glass-border); backdrop-filter: blur(10px);
        display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s;
        font-size: 13px; font-weight: 500; color: #fff;
    }
    .model-selector-trigger:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
    .selected-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    
    .model-dropdown {
        position: absolute; bottom: 100%; left: 0; right: 0; margin-bottom: 10px;
        background: #09090b; border: 1px solid var(--glass-border); border-radius: 12px;
        padding: 6px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); overflow: hidden;
        max-height: 300px; overflow-y: auto; z-index: 100;
    }
    .model-dropdown::-webkit-scrollbar { width: 4px; }
    .model-dropdown::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }

    .model-option { 
        padding: 10px 14px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 10px;
        transition: 0.2s;
    }
    .model-option:hover { background: rgba(255,255,255,0.08); }
    .model-option.selected { background: rgba(167, 139, 250, 0.15); }
    .model-option.warning .model-name { color: #f87171; }
    
    .model-info { flex: 1; text-align: left; }
    .model-name { font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 2px; }
    .model-meta { font-size: 10px; color: var(--text-muted); }
    .fit-ok { color: #34d399; } 
    .fit-bad { color: #f87171; font-weight: 600; }
    .check { color: var(--primary); font-size: 14px; }

    /* HEADER */
    .hud-header { height: 70px; display: flex; align-items: center; padding: 0 30px; border-bottom: 1px solid var(--glass-border); background: rgba(3, 3, 5, 0.75); backdrop-filter: blur(20px); z-index: 10; justify-content: space-between; }
    .brand { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 600; cursor: pointer; letter-spacing: -0.5px; }
    .brand-thin { font-family: 'Inter', sans-serif; font-weight: 300; opacity: 0.7; font-size: 20px; }
    .breadcrumbs { flex: 1; margin: 0 40px; display: flex; gap: 8px; overflow: hidden; white-space: nowrap; mask-image: linear-gradient(90deg, #000 80%, transparent 100%); font-size: 13px; color: var(--text-muted); }
    .crumb { color: #fff; font-weight: 500; transition: color 0.2s; }
    .crumb:hover { color: var(--primary); }
    .exit-icon-btn { background: none; border: 1px solid var(--glass-border); color: var(--text-muted); width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
    .exit-icon-btn:hover { background: #fff; color: #000; }

    /* COLUMNS */
    .miller-columns-container { flex: 1; display: flex; overflow-x: auto; padding: 30px 40px; gap: 24px; }
    .miller-columns-container::-webkit-scrollbar { height: 6px; }
    .miller-columns-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

    .column { min-width: var(--col-width); width: var(--col-width); display: flex; flex-direction: column; }
    .column-header {
      font-size: 10px; font-weight: 700; color: var(--text-muted); margin-bottom: 16px;
      letter-spacing: 1.5px; opacity: 0.6; display: flex; justify-content: space-between; align-items: center;
    }
    .regenerate-btn {
      background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);
      color: var(--text-muted); cursor: pointer;
      font-size: 10px; transition: all 0.2s; padding: 6px 10px; line-height: 1; border-radius: 4px;
      display: flex; align-items: center; gap: 6px; font-weight: 700; letter-spacing: 0.5px;
    }
    .regenerate-btn:hover {
        color: var(--primary); border-color: var(--primary);
        background: rgba(139, 92, 246, 0.1);
    }
    .node-list { display: flex; flex-direction: column; gap: 12px; padding-bottom: 100px; }

    /* NODE CARDS */
    .node-card { 
        background: rgba(255,255,255,0.02); 
        border: 1px solid var(--glass-border); 
        border-radius: 12px; 
        padding: 24px; 
        position: relative; overflow: hidden;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .node-card::before {
        content: ''; position: absolute; inset: 0; padding: 1px; border-radius: 12px;
        background: linear-gradient(145deg, rgba(255,255,255,0.1), transparent 60%);
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor; mask-composite: exclude;
        pointer-events: none;
    }
    .node-card:hover {
        background: rgba(255,255,255,0.05);
        border-color: rgba(255,255,255,0.2);
        transform: translateY(-2px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .node-card.active {
        background: rgba(167, 139, 250, 0.08);
        border-color: rgba(167, 139, 250, 0.4);
    }

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
        border-color: rgba(255,255,255,0.25);
        color: #fff; 
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
    .action-btn:active { transform: translateY(0); }
    
    .btn-icon { display: flex; align-items: center; opacity: 0.7; transition: 0.2s; }
    .action-btn:hover .btn-icon { opacity: 1; color: var(--primary); transform: scale(1.1); }

    .active-glow { 
        position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--primary);
        box-shadow: 0 0 20px var(--primary); z-index: 1;
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
    .panel-meta { font-size: 10px; color: var(--text-muted); letter-spacing: 1px; margin-top: 5px; }

    .panel-tabs { display: flex; padding: 0 50px; border-bottom: 1px solid var(--glass-border); gap: 30px; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
    .panel-tabs::-webkit-scrollbar { display: none; }
    
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
        background: rgba(167, 139, 250, 0.05); border-left: 3px solid var(--primary);
        padding: 24px; margin: 30px 0; font-style: italic; color: #e5e7eb; border-radius: 0 8px 8px 0;
    }

    /* HISTORY TIMELINE */
    .timeline-container {
        position: relative;
        padding-left: 20px;
        border-left: 2px solid rgba(167, 139, 250, 0.3);
        margin: 20px 0 20px 10px;
    }
    .timeline-item {
        position: relative;
        margin-bottom: 40px;
    }
    .timeline-item::before {
        content: '';
        position: absolute;
        left: -27px;
        top: 0;
        width: 12px;
        height: 12px;
        background: var(--primary);
        border-radius: 50%;
        box-shadow: 0 0 10px var(--primary);
    }
    .timeline-year {
        font-size: 14px;
        font-weight: 700;
        color: var(--primary);
        margin-bottom: 8px;
        font-family: 'Inter', sans-serif;
    }
    .timeline-content h4 {
        margin: 0 0 8px 0;
        color: #fff;
        font-size: 18px;
    }
    .timeline-content p {
        margin: 0;
        font-size: 15px;
        color: var(--text-muted);
        line-height: 1.6;
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

    /* TIMELINE */
    .timeline-wrapper {
        position: fixed; bottom: 30px; left: 0; right: 0;
        display: flex; justify-content: center; z-index: 50;
        pointer-events: none;
    }

    .timeline-container {
        pointer-events: auto;
        height: auto;
        background: rgba(15, 15, 20, 0.85);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 100px;
        backdrop-filter: blur(20px);
        padding: 8px 10px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.2);
        display: flex; align-items: center; justify-content: center;
        max-width: 90%;
    }

    .timeline-track {
        display: flex; align-items: center;
        gap: 6px;
        overflow-x: auto;
        padding: 4px 10px;
        max-width: 100%;
        scrollbar-width: none;
    }
    .timeline-track::-webkit-scrollbar { display: none; }

    .timeline-node {
        display: flex; align-items: center;
        cursor: pointer;
        opacity: 0.6;
        transition: 0.3s;
        position: relative;
        padding: 6px 12px 6px 6px;
        border-radius: 50px;
        background: transparent;
        border: 1px solid transparent;
        gap: 10px;
    }

    .timeline-node:hover { opacity: 1; background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
    .timeline-node.current { opacity: 1; background: rgba(167, 139, 250, 0.15); border-color: rgba(167, 139, 250, 0.3); padding-right: 16px; }

    .t-dot {
        width: 32px; height: 32px; border-radius: 50%;
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
        display: flex; align-items: center; justify-content: center;
        font-size: 11px; font-weight: 700; color: #fff;
        position: relative;
        flex-shrink: 0;
    }
    .timeline-node.current .t-dot {
        background: var(--primary); border-color: var(--primary);
        box-shadow: 0 0 15px rgba(167, 139, 250, 0.5);
    }

    .t-pulse {
        position: absolute; inset: -4px; border-radius: 50%;
        border: 2px solid var(--primary); opacity: 0;
        animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    }

    @keyframes pulse-ring {
        0% { transform: scale(0.8); opacity: 0.8; }
        100% { transform: scale(1.5); opacity: 0; }
    }

    .t-info { display: flex; flex-direction: column; justify-content: center; }

    .t-label {
        font-size: 12px; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.5px;
        white-space: nowrap; max-width: 150px; overflow: hidden; text-overflow: ellipsis;
        color: #fff;
    }

    .t-connector {
        width: 16px; height: 2px; background: rgba(255,255,255,0.1);
        border-radius: 2px;
    }

    /* TOASTS */
    .toast-container { 
        position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
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

    /* QUIZ STYLES */
    .quiz-container { display: flex; flex-direction: column; gap: 20px; }
    .quiz-progress { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--secondary); font-weight: 700; }
    .quiz-question { font-size: 22px; color: #fff; margin: 0; font-family: 'Inter', sans-serif; font-weight: 600; }
    .quiz-options { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
    .quiz-option { 
        background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);
        padding: 16px; border-radius: 8px; color: #d1d5db; text-align: left; cursor: pointer;
        transition: 0.2s; font-size: 15px; position: relative;
    }
    .quiz-option:hover:not(:disabled) { background: rgba(255,255,255,0.1); transform: translateX(5px); }
    .quiz-option.correct { background: rgba(52, 211, 153, 0.2); border-color: rgba(52, 211, 153, 0.5); color: #34d399; }
    .quiz-option.wrong { background: rgba(248, 113, 113, 0.2); border-color: rgba(248, 113, 113, 0.5); color: #f87171; }
    .quiz-explanation { background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; border-left: 3px solid var(--primary); margin-top: 10px; font-size: 14px; line-height: 1.6; }
    .next-btn { display: block; margin-top: 15px; background: var(--primary); border: none; padding: 10px 20px; border-radius: 6px; color: #fff; font-weight: 600; cursor: pointer; float: right; }

    .quiz-results { text-align: center; padding: 40px; }
    .score-circle { 
        width: 120px; height: 120px; border-radius: 50%; border: 4px solid var(--primary);
        display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;
        font-size: 32px; font-weight: 700; color: #fff;
    }
    .quiz-error { text-align: center; color: #f87171; }
    .raw-content { background: #000; padding: 10px; border-radius: 4px; overflow-x: auto; text-align: left; margin-top: 10px; opacity: 0.7; }

    /* QUIZ NEW STYLES */
    .quiz-config { text-align: center; padding: 20px; }
    .quiz-config h3 { font-family: 'Playfair Display', serif; font-size: 32px; color: #fff; margin-bottom: 40px; }
    .config-grid { display: flex; flex-direction: column; gap: 30px; margin-bottom: 40px; }
    .config-item { display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .config-item label { font-size: 11px; font-weight: 700; color: var(--secondary); letter-spacing: 1px; text-transform: uppercase; }
    
    .segmented-control { display: flex; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 4px; gap: 4px; }
    .segmented-control button { flex: 1; background: transparent; border: none; padding: 8px 16px; color: var(--text-muted); font-size: 12px; cursor: pointer; border-radius: 6px; transition: 0.2s; font-weight: 500; }
    .segmented-control button:hover { color: #fff; }
    .segmented-control button.active { background: var(--primary); color: #fff; }

    .range-slider { width: 100%; max-width: 200px; accent-color: var(--primary); }
    
    .start-quiz-btn { background: #fff; color: #000; border: none; padding: 14px 40px; font-size: 14px; font-weight: 700; border-radius: 50px; cursor: pointer; transition: 0.2s; letter-spacing: 1px; }
    .start-quiz-btn:hover { transform: scale(1.05); box-shadow: 0 0 20px rgba(255,255,255,0.3); }

    .quiz-progress-bar { width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-bottom: 10px; overflow: hidden; }
    .progress-fill { height: 100%; background: var(--primary); transition: width 0.3s ease; }
    .quiz-progress-text { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 15px; }

    .opt-letter { display: inline-block; width: 24px; height: 24px; background: rgba(255,255,255,0.1); border-radius: 50%; text-align: center; line-height: 24px; font-size: 11px; margin-right: 12px; font-weight: 700; color: #fff; }
    .quiz-option:hover .opt-letter { background: #fff; color: #000; }

    .results-review { margin-top: 30px; text-align: left; background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; max-height: 300px; overflow-y: auto; }
    .results-review h4 { margin-top: 0; font-size: 14px; color: var(--secondary); text-transform: uppercase; letter-spacing: 1px; }
    .review-item { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .review-q { font-size: 14px; color: #fff; margin-bottom: 6px; font-weight: 500; }
    .review-ans { font-size: 12px; font-family: monospace; }
    
    /* DIAGRAM WIDGET STYLES */
    .diagram-widget { margin: 40px 0; border: 1px solid var(--glass-border); border-radius: 12px; overflow: hidden; background: rgba(0,0,0,0.4); box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
    .dw-header { background: rgba(255,255,255,0.03); padding: 12px 20px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--glass-border); }
    .dw-icon { color: var(--secondary); font-size: 18px; }
    .dw-title { font-size: 11px; font-weight: 700; color: var(--text-muted); letter-spacing: 1.5px; }
    .dw-frame { position: relative; width: 100%; min-height: 200px; display: flex; align-items: center; justify-content: center; background: #000; }
    .dw-image { width: 100%; height: auto; display: block; transition: opacity 0.5s ease; }
    .dw-loader { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; color: var(--text-muted); font-size: 12px; font-family: monospace; }
    
    .spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--secondary); border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .quiz-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .streak-badge { background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.4); }
    .timer-track { flex: 1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin: 0 15px; overflow: hidden; }
    .timer-fill { height: 100%; background: #34d399; transition: width 1s linear; }
    .timer-fill.danger { background: #f87171; }
    .timer-text { font-size: 12px; font-weight: 700; color: var(--text-muted); width: 30px; text-align: right; }
  `}</style>
);

export default App;