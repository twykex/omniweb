# OmniWeb // The Infinite Learning Engine

OmniWeb is a local-first, AI-powered educational tool designed for infinite exploration. It visualizes knowledge as a spatial map using **Miller Columns**, allowing you to break down any topic into its constituent parts recursively—forever.

It runs entirely on your machine using **Ollama**, ensuring complete privacy and zero subscription costs.

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Python](https://img.shields.io/badge/python-3.9+-yellow.svg) ![React](https://img.shields.io/badge/react-19+-blue.svg) ![AI Local](https://img.shields.io/badge/AI-Local-purple.svg)

## 🌌 Core Features

*   **Infinite Recursion:** Click on any concept (e.g., "Coffee") to break it down into sub-concepts (Chemistry, Economics, History). Click those to break them down further. There is no limit to the depth.
*   **Miller Column Navigation:** A horizontal, sliding interface inspired by macOS Finder, allowing you to trace your intellectual path back to the root.
*   **Privacy First:** Uses local LLMs (Llama 3, Mistral, etc.) via Ollama. No data leaves your computer.
*   **Smart Model Selection:** Automatically detects your GPU VRAM and recommends models that fit.
*   **Generative AI Diagrams:** Automatically generates schematic diagrams for scientific concepts using Pollinations AI.

### 🧠 Deep Learning Modes
Every node comes with 9 specialized AI learning modes:

1.  **Explain:** A clear, professor-style explanation with analogies.
2.  **History:** A generated timeline of key events and milestones.
3.  **Impact:** Why this concept matters to humanity and its ethical implications.
4.  **ELI5:** "Explain Like I'm 5" - simple terms and fun examples.
5.  **Future:** Speculative analysis of future developments (next 50 years).
6.  **Code:** Technical demonstrations, formulas, or code snippets.
7.  **Pros/Cons:** Critical analysis of advantages and disadvantages.
8.  **Debate:** A simulated dialogue between a Proponent and a Skeptic.
9.  **Quiz:** An interactive multiple-choice quiz to test your knowledge.

## ⚡ Prerequisites

Before installing, ensure you have the following:

*   **Python 3.9+**: [Download Here](https://www.python.org/downloads/)
*   **Node.js (v18+)**: [Download Here](https://nodejs.org/)
*   **Ollama**: [Download Here](https://ollama.com/)

### Critical Step: Setup Ollama
OmniWeb requires a local AI model to function.

1.  Install Ollama.
2.  Open your terminal/command prompt.
3.  Run the following command to pull a model (Llama3 is recommended):
    ```bash
    ollama pull llama3
    ```
    (You can also use `mistral`, `gemma2`, `phi3`, etc.)

## 🛠️ Installation & Setup

### 🪟 Windows (One-Click Run)

1.  **Clone the repository:**
    ```powershell
    git clone https://github.com/twykex/omniweb.git
    cd omniweb
    ```

2.  **First Time Setup (Manual):**
    You must install dependencies once before using the batch script.

    *Backend:*
    ```powershell
    python -m venv .venv
    .\.venv\Scripts\activate
    pip install -r requirements.txt
    ```

    *Frontend:*
    ```powershell
    cd omniweb
    npm install
    ```

3.  **Run the App:**
    *   Double click `START_NEXUS.bat` in the root folder.
    *   This will launch the backend and frontend in separate windows.

### 🍎 macOS / 🐧 Linux / Manual

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/twykex/omniweb.git
    cd omniweb
    ```

2.  **Setup & Run Backend:**
    ```bash
    # Terminal 1
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    uvicorn server:app --reload
    ```

3.  **Setup & Run Frontend:**
    ```bash
    # Terminal 2
    cd omniweb
    npm install
    npm start
    ```

## 🎮 How to Use

1.  **Initialize:** Open the web page (usually `http://localhost:3000`).
2.  **Select Model:** The app will auto-detect available models. Select one from the dropdown.
3.  **Start:** Type a topic (e.g., "Quantum Physics") or click **"🎲 Surprise Me"**.
4.  **Explore:**
    *   **Expand:** Click a card to reveal sub-topics in a new column.
    *   **Learn:** Click the buttons on a card (`Explain`, `History`, `Quiz`, etc.) to open the Learning Module.
    *   **Regenerate:** If a level feels repetitive, click **"↻ REGENERATE"** at the top of the column to get fresh topics.
5.  **Navigation:**
    *   Use the breadcrumbs at the top to jump back.
    *   Click the timeline bar at the bottom to scroll quickly.
    *   Press **Esc** to close the learning panel.

## 🐛 Troubleshooting

*   **"Backend Offline" / Infinite Loading:**
    *   Ensure the backend server (`server.py`) is running.
    *   Ensure Ollama is running (`ollama serve`).
*   **"Ollama Connection Failed":**
    *   Ollama must be running on port `11434`.
*   **React Errors:**
    *   If you see dependency errors, try deleting `omniweb/node_modules` and running `npm install` again inside the `omniweb` folder.
