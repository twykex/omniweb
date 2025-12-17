import json
import requests
import re
import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- Configuration & Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

OLLAMA_BASE = os.getenv("OLLAMA_HOST", "http://localhost:11434")
MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class ExpandRequest(BaseModel):
    node: str
    context: str
    model: str
    temperature: float = 0.4

class AnalysisRequest(BaseModel):
    node: str
    context: str
    model: str
    mode: str

# --- Utilities ---
def robust_json_parser(text):
    text = re.sub(r"```json", "", text, flags=re.IGNORECASE)
    text = re.sub(r"```", "", text)
    start = text.find('{')
    end = text.rfind('}') + 1
    if start != -1 and end != -1:
        text = text[start:end]
    return text

# --- Mock Service ---
class MockService:
    @staticmethod
    def get_models():
        return {"models": ["mock-llama3", "mock-mistral"]}

    @staticmethod
    def expand_node(node):
        return {
            "children": [
                {"name": f"{node} Basics", "desc": f"Fundamental concepts of {node}.", "status": "concept"},
                {"name": f"History of {node}", "desc": "How it all started.", "status": "entity"},
                {"name": f"{node} in Practice", "desc": "Real world applications.", "status": "process"},
                {"name": f"Advanced {node}", "desc": "Deep dive into complexity.", "status": "concept"},
                {"name": f"{node} Future", "desc": "What lies ahead.", "status": "concept"}
            ]
        }

    @staticmethod
    def analyze_node(node, mode):
        return {
            "content": f"""
# {mode.capitalize()} of {node} (MOCK)

This is a **simulated response** for testing purposes.

## Key Points
- Point 1 about {node}
- Point 2 about {node}

> "This is a mock quote about {node}."

## Detailed Explanation
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            """
        }

# --- Check Offline/Online Status ---
def is_ollama_online():
    if MOCK_MODE:
        return False
    try:
        requests.get(f"{OLLAMA_BASE}", timeout=1)
        return True
    except:
        return False

# --- Routes ---

@app.get("/models")
def get_models():
    if not is_ollama_online():
        logger.warning("Ollama offline or Mock Mode enabled. Returning mock models.")
        return MockService.get_models()

    try:
        res = requests.get(f"{OLLAMA_BASE}/api/tags", timeout=2)
        if res.status_code == 200:
            data = res.json()
            models = [m['name'] for m in data.get('models', [])]
            return {"models": models}
        logger.error(f"Ollama returned status {res.status_code}")
        return {"models": []}
    except Exception as e:
        logger.error(f"Failed to fetch models: {e}")
        return {"models": []}


@app.post("/expand")
def expand_node(req: ExpandRequest):
    logger.info(f"Expanding Topic: [{req.node}]")

    if not is_ollama_online():
        return MockService.expand_node(req.node)

    # Context truncation
    context_parts = req.context.split(" > ")
    short_context = " > ".join(context_parts[-4:])

    system_prompt = f"""
    You are an Expert Curriculum Designer.
    Current Subject: {req.node} (Context: {short_context})

    TASK: Identify 5 distinct learning paths or sub-topics for a student studying "{req.node}".

    RULES:
    1. "name": Clear, academic terminology (Max 4 words). Title Case.
    2. "desc": A specific definition. (Max 20 words).
    3. "status": "concept" (theory), "entity" (person/place/thing), or "process" (action/verb).

    OUTPUT JSON:
    {{ "children": [ {{ "name": "Topic Name", "desc": "Definition.", "status": "concept" }} ] }}
    """

    payload = {
        "model": req.model,
        "prompt": system_prompt,
        "stream": False,
        "options": {"temperature": req.temperature, "num_ctx": 4096}
    }

    try:
        response = requests.post(f"{OLLAMA_BASE}/api/generate", json=payload, timeout=60)
        response.raise_for_status()
        data = json.loads(robust_json_parser(response.json().get("response", "")))
        return data
    except json.JSONDecodeError:
        logger.error("Failed to parse JSON from Ollama response")
        return {"children": []}
    except requests.RequestException as e:
        logger.error(f"Ollama request failed: {e}")
        raise HTTPException(status_code=503, detail="AI Service Unavailable")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return {"children": []}


@app.post("/analyze")
def analyze_node(req: AnalysisRequest):
    logger.info(f"Teaching [{req.node}] Mode: {req.mode}")

    if not is_ollama_online():
        return MockService.analyze_node(req.node, req.mode)

    prompts = {
        "explain": f"Teach '{req.node}' to a beginner. Use a clear analogy (formatted as a > blockquote) to explain the core concept. Then detail how it works.",
        "history": f"Provide a historical timeline of '{req.node}'. Key figures, dates, and the 'Aha!' moment of discovery. Use Markdown lists.",
        "impact": f"Analyze the significance of '{req.node}'. Why does it matter to humanity or the universe? What are the ethical or practical implications?",
        "eli5": f"Explain '{req.node}' to a 5-year-old. Use simple words and fun examples.",
        "future": f"Speculate on the future of '{req.node}'. What advances or changes can we expect in the next 50 years?",
        "quiz": f"Create a 3-question multiple choice quiz about '{req.node}'. Format: Question, Options, then Answer at the very end."
    }

    system_prompt = f"""
    Context: {req.context}
    Topic: {req.node}
    Task: {prompts.get(req.mode, prompts['explain'])}

    Style: Engaging, Professor-like, Clear.
    Format: Markdown with headers (#, ##), bolding (**), and lists (-).
    """

    payload = {
        "model": req.model,
        "prompt": system_prompt,
        "stream": False,
        "options": {"temperature": 0.6}
    }

    try:
        response = requests.post(f"{OLLAMA_BASE}/api/generate", json=payload, timeout=120)
        response.raise_for_status()
        return {"content": response.json().get("response", "Lesson generation failed.")}
    except requests.RequestException as e:
        logger.error(f"Ollama request failed: {e}")
        raise HTTPException(status_code=503, detail="AI Service Unavailable")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return {"content": f"Error: {str(e)}"}
