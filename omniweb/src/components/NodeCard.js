import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import Icons from './Icons';

const ActionButton = ({ label, icon, onClick }) => (
    <button className="action-btn" onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <span className="btn-icon">{icon}</span>
        <span className="btn-label">{label}</span>
    </button>
);

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
            <ActionButton icon={<Icons.Glossary />} label="Glossary" onClick={() => onAction('glossary')} />
            <ActionButton icon={<Icons.Sources />} label="Sources" onClick={() => onAction('sources')} />
            <ActionButton icon={<Icons.Quiz />} label="Quiz" onClick={() => onAction('quiz')} />
          </motion.div>
        )}
      </AnimatePresence>

      {isActive && <motion.div layoutId="activeGlow" className="active-glow" />}
    </motion.div>
  );
};

export default NodeCard;
