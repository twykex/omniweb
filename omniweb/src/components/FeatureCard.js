import React from 'react';
import { motion } from "framer-motion";

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

export default FeatureCard;
