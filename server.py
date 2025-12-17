import json
import requests
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

OLLAMA_BASE = "http://localhost:11434"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExpandRequest(BaseModel):
    node: str
    context: str
    model: str
    temperature: float


class AnalysisRequest(BaseModel):
    node: str
    context: str
    model: str
    mode: str


def robust_json_parser(text):
    text = re.sub(r"```json", "", text, flags=re.IGNORECASE)
    text = re.sub(r"```", "", text)
    start = text.find('{')
    end = text.rfind('}') + 1
    if start != -1 and end != -1:
        text = text[start:end]
    return text


@app.get("/models")
def get_models():
    try:
        res = requests.get(f"{OLLAMA_BASE}/api/tags", timeout=2)
        if res.status_code == 200:
            data = res.json()
            models = [m['name'] for m in data['models']]
            return {"models": models}
        return {"models": []}
    except:
        return {"models": []}


@app.post("/expand")
def expand_node(req: ExpandRequest):
    print(f"\n⚡ Expanding Topic: [{req.node}]")

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
        "options": {"temperature": 0.4, "num_ctx": 4096}
    }

    try:
        response = requests.post(f"{OLLAMA_BASE}/api/generate", json=payload, timeout=60)
        data = json.loads(robust_json_parser(response.json().get("response", "")))
        return data
    except Exception as e:
        print(f"Error: {e}")
        return {"children": []}


@app.post("/analyze")
def analyze_node(req: AnalysisRequest):
    print(f"\n📚 Teaching [{req.node}] Mode: {req.mode}")

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
    Task: {prompts.get(req.mode)}

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
        return {"content": response.json().get("response", "Lesson generation failed.")}
    except Exception as e:
        return {"content": f"Error: {str(e)}"}