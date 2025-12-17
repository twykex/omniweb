import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./HistoryTimeline.css";

export const HistoryTimeline = ({ jsonString }) => {
    const [events, setEvents] = useState([]);
    const [error, setError] = useState(false);
    const [filterText, setFilterText] = useState("");
    const [sortOrder, setSortOrder] = useState("asc"); // asc or desc

    useEffect(() => {
        try {
            if (!jsonString) return;
            // cleaning the json string
            let cleanJson = jsonString.trim();
            cleanJson = cleanJson.replace(/```json/gi, "").replace(/```/g, "");

            let parsed = null;
            try {
                parsed = JSON.parse(cleanJson);
            } catch (e) {
                // Failed to parse, try to extract array
                const start = cleanJson.indexOf('[');
                const end = cleanJson.lastIndexOf(']') + 1;
                if (start !== -1 && end !== -1) {
                    parsed = JSON.parse(cleanJson.substring(start, end));
                } else {
                    throw e;
                }
            }

            let parsedEvents = [];

            if (Array.isArray(parsed)) {
                parsedEvents = parsed;
            } else if (parsed.events && Array.isArray(parsed.events)) {
                parsedEvents = parsed.events;
            } else {
                 // Try to convert object to array
                 parsedEvents = Object.keys(parsed).map(key => {
                    const val = parsed[key];
                    if (typeof val === 'object') {
                        return { year: key, ...val };
                    }
                    return { year: key, title: "Event", description: val };
                 });
            }

            // Normalize structure
            parsedEvents = parsedEvents.map(e => ({
                year: e.year || "Unknown",
                title: e.title || "Untitled Event",
                description: e.description || "No description available."
            }));

            setEvents(parsedEvents);
            setError(false);
        } catch (e) {
            console.error("Failed to parse history JSON", e);
            setError(true);
        }
    }, [jsonString]);

    const processedEvents = useMemo(() => {
        let filtered = events.filter(e => {
            const text = (e.title + " " + e.description + " " + e.year).toLowerCase();
            return text.includes(filterText.toLowerCase());
        });

        filtered.sort((a, b) => {
            const yearA = parseInt(String(a.year).replace(/\D/g, "")) || 0;
            const yearB = parseInt(String(b.year).replace(/\D/g, "")) || 0;
            return sortOrder === "asc" ? yearA - yearB : yearB - yearA;
        });

        return filtered;
    }, [events, filterText, sortOrder]);

    if (error) return <div className="error-msg">Failed to load timeline data.</div>;
    if (!events.length && !error) return <div className="loading-msg">Parsing timeline...</div>;

    return (
        <div className="history-timeline-wrapper">
            <div className="history-controls">
                <input
                    type="text"
                    className="history-search"
                    placeholder="Search history..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                />
                <button
                    className="history-sort-btn"
                    onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                >
                    {sortOrder === "asc" ? "Oldest" : "Newest"}
                    <span>{sortOrder === "asc" ? "↓" : "↑"}</span>
                </button>
            </div>

            <div className="timeline-feed">
                <AnimatePresence mode="popLayout">
                    {processedEvents.map((event, i) => (
                        <TimelineItem key={`${event.year}-${i}`} event={event} index={i} />
                    ))}
                </AnimatePresence>
                {processedEvents.length === 0 && (
                     <div className="empty-state">
                        No events found matching "{filterText}"
                    </div>
                )}
            </div>
        </div>
    );
};

const TimelineItem = ({ event, index }) => {
    return (
        <motion.div
            className="timeline-entry"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            layout
        >
            <div className="timeline-dot" />
            <div className="timeline-card">
                <div className="timeline-year">{event.year}</div>
                <div className="timeline-title">{event.title}</div>
                <div className="timeline-desc">{event.description}</div>
            </div>
        </motion.div>
    );
};
