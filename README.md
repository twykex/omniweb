OmniWeb // The Infinite Learning Engine
OmniWeb is a local-first, AI-powered educational tool designed for infinite exploration. Unlike traditional chatbots, OmniWeb visualizes knowledge as a spatial map (Miller Columns), allowing users to break down any topic into its constituent parts recursively—forever.
It runs entirely on your machine using Ollama, ensuring complete privacy and zero subscription costs.
![alt text](https://img.shields.io/badge/license-MIT-blue.svg)

![alt text](https://img.shields.io/badge/python-3.9+-yellow.svg)

![alt text](https://img.shields.io/badge/react-18+-blue.svg)

![alt text](https://img.shields.io/badge/AI-Local-purple.svg)
🌌 Features
Infinite Recursion: Click on any concept (e.g., "Coffee") to break it down into sub-concepts (Chemistry, Economics, History). Click those to break them down further. There is no limit to the depth.
Miller Column Navigation: A horizontal, sliding interface inspired by macOS Finder, allowing you to trace your intellectual path back to the root.
Deep Dive Modules: Every node comes with three specialized AI learning modes:
Explain: A clear, professor-style explanation with analogies.
History: A timeline of how this concept came to be.
Impact: Why this concept matters in the real world.
Local Privacy: Uses local LLMs (Llama 3, Mistral, etc.) via Ollama. No data leaves your computer.
EdTech UI: High-fidelity Glassmorphism interface designed for reading comfort and focus.
📂 Project Structure
Here is what the key files in this repository do:
Backend (Root Directory)
server.py: The brain of the operation. A Python FastAPI server that receives requests from the UI, constructs educational prompts, and queries your local Ollama instance.
requirements.txt: List of Python dependencies (FastAPI, Requests, Uvicorn, etc.).
START_NEXUS.bat: A Windows batch script to automatically launch both the backend and frontend.
check_brain.py / debug_brain.py: Utility scripts to test if Ollama is running and responding correctly before launching the full UI.
Frontend (omniweb/ Directory)
src/App.js: The heart of the application. Contains the React logic for the Miller Columns, animations, API communication, and Markdown rendering.
src/index.css: (If applicable) or internal styles in App.js handle the glassmorphism and animations.
public/: Static assets.
⚡ Prerequisites
Before installing, ensure you have the following:
Python 3.9+: Download Here
Node.js (for React): Download Here
Ollama: Download Here
Critical Step: Setup Ollama
OmniWeb requires a local AI model to function.
Install Ollama.
Open your terminal/command prompt.
Run the following command to pull a model (Llama3 is recommended):
code
Bash
ollama pull llama3
(You can also use mistral, gemma, etc.)
🛠️ Installation & Setup
🪟 Windows
Clone the repository:
code
Powershell
git clone https://github.com/twykex/omniweb.git
cd omniweb
Setup the Backend:
code
Powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
Setup the Frontend:
code
Powershell
cd omniweb
npm install
Run the App:
You can use the included shortcut:
Double click START_NEXUS.bat
Or run manually in two separate terminals:
Terminal 1: python server.py
Terminal 2: cd omniweb && npm start
🍎 macOS / 🐧 Linux
Clone the repository:
code
Bash
git clone https://github.com/twykex/omniweb.git
cd omniweb
Setup the Backend:
code
Bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
Setup the Frontend:
code
Bash
cd omniweb
npm install
Run the App:
You need to run the backend and frontend simultaneously.
Terminal 1 (Backend):
code
Bash
# Make sure you are in the root folder and venv is active
source .venv/bin/activate
python3 server.py
Terminal 2 (Frontend):
code
Bash
cd omniweb
npm start
🎮 How to Use
Initialize: Open the web page (usually http://localhost:3000).
Select Model: Select your installed Ollama model from the dropdown (e.g., llama3).
Search: Type a topic you want to master (e.g., "Quantum Physics", "The Roman Empire", "Sourdough Bread").
Explore:
Click a card to break it down into sub-topics.
Hover over a card to reveal learning tools.
Click Explain, History, or Impact to generate a dedicated lesson plan on the right side.
Copy: Use the "Copy Text" button in the lesson panel to save notes to your clipboard.
🐛 Troubleshooting
"Backend Offline" / Infinite Loading:
Ensure server.py is running.
Ensure Ollama is running (ollama serve in a terminal).
"Network Error" when clicking nodes:
Check if your antivirus is blocking localhost:8000.
React errors:
Delete the omniweb/node_modules folder and run npm install again.