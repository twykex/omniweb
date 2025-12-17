import React, { useRef } from 'react';
import { motion } from "framer-motion";
import ModelSelector from './ModelSelector';
import FeatureCard from './FeatureCard';
import { SUGGESTED_TOPICS } from '../constants';

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

export default LandingInterface;
