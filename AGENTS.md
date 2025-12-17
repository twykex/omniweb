# ⛔ CRITICAL INSTRUCTIONS FOR AI AGENTS

**DO NOT ATTEMPT TO EXECUTE, TEST, OR DEBUG OLLAMA CONNECTIONS.**

## ⚠️ Environment Limitation
This project relies entirely on a **Local Large Language Model (LLM)** running via **Ollama** on the user's physical machine at `http://localhost:11434`.

As an AI Agent running in a cloud sandbox or remote environment, **you do not have access to a GPU, nor do you have access to the user's localhost network.**

## 🚫 Strictly Forbidden Actions
1.  **Do NOT try to run `server.py`** to test endpoints. It will fail immediately because it cannot connect to Ollama.
2.  **Do NOT try to run `check_brain.py`** or `debug_brain.py`.
3.  **Do NOT attempt to "fix" `ConnectionRefusedErrors`** regarding port 11434. These are expected in your environment.
4.  **Do NOT suggest installing Ollama** inside the CI/CD or Agent environment. It requires system-level access and hardware acceleration that you do not have.

## ✅ How to Contribute Safely
If you are asked to modify this project, proceed via **Static Analysis** only:

*   **Frontend (React):** You may modify `App.js` and CSS. If you need to verify UI changes, you must **mock** the API responses. Do not expect the real backend to return data.
*   **Backend (Python):** You may refactor code logic, improve prompt engineering in `server.py`, or clean up syntax. Assume the connection to `localhost:11434` works for the end-user, even if it fails for you.

**SUMMARY:** Assume the Backend and AI Model are "Black Boxes" that work perfectly for the user. Do not try to verify them live.