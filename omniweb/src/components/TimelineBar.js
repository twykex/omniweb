import React from 'react';
import { motion } from "framer-motion";
import Icons from "./Icons";

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
                        <Icons.Home />
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

export default TimelineBar;
