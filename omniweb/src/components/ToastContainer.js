import React from 'react';
import { motion, AnimatePresence } from "framer-motion";

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

export default ToastContainer;
