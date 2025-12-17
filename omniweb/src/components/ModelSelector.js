import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";

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

export default ModelSelector;
