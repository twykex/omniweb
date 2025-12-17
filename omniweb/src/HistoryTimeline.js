import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { extractJSON } from "./utils";

export const HistoryTimeline = ({ jsonString }) => {
    const [events, setEvents] = useState([]);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!jsonString) return;
        const parsed = extractJSON(jsonString);
        if (Array.isArray(parsed)) {
            setEvents(parsed);
            setError(false);
        } else {
            setError(true);
        }
    }, [jsonString]);

    if (error) return <div className="error-msg">Failed to load timeline data.</div>;

    return (
        <div className="timeline-container">
            {events.map((event, i) => (
                <motion.div
                    className="timeline-item"
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                >
                    <div className="timeline-year">{event.year}</div>
                    <div className="timeline-content">
                        <h4>{event.title}</h4>
                        <p>{event.description}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};
