import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { HistoryTimeline } from "../HistoryTimeline";
import TimelineBar from "./TimelineBar";
import NodeCard from "./NodeCard";
import SkeletonColumn from "./SkeletonColumn";
import { QuizInterface, QuizConfig } from "./QuizInterface";
import DiagramWidget from "./DiagramWidget";
import { BASE_URL } from "../constants";
import { processAutoDiagrams } from "../helpers";

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
  const lessonDataRef = useRef(lessonData);

  useEffect(() => {
    lessonDataRef.current = lessonData;
  }, [lessonData]);

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
        if (endRef.current && endRef.current.scrollIntoView) {
            endRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
      }, 100);
    }
  }, [columns, isThinking]);

  // Handle Escape Key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (lessonDataRef.current) closeLesson();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      if (isThinking) return;
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

export default LearningWorkspace;
