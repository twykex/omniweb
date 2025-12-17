import React from 'react';

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

export default GlobalCSS;
