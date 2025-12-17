import json
import requests
import re
import subprocess
import shutil
import platform
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


def get_gpu_vram():
    try:
        # Check for NVIDIA GPU via nvidia-smi
        if shutil.which("nvidia-smi"):
            output = subprocess.check_output(
                ["nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits"],
                encoding="utf-8"
            )
            # Sum up all GPUs? Usually we run on one, but let's take the first one or sum?
            # For simplicity, taking the first one (usually index 0) or the max.
            # If multiple lines, split lines.
            lines = output.strip().split('\n')
            if lines:
                total_mib = int(lines[0]) # Use first GPU
                return total_mib * 1024 * 1024

        # Check for macOS (Unified Memory) - rough estimate (75% of total RAM usually available for GPU)
        if platform.system() == "Darwin":
            output = subprocess.check_output(["sysctl", "-n", "hw.memsize"], encoding="utf-8")
            total_mem = int(output.strip())
            return int(total_mem * 0.75)

    except Exception:
        pass
    return None


@app.get("/models")
def get_models():
    vram = get_gpu_vram()
    try:
        res = requests.get(f"{OLLAMA_BASE}/api/tags", timeout=2)
        if res.status_code == 200:
            data = res.json()
            models_list = []
            for m in data.get('models', []):
                size_bytes = m.get('size', 0)
                fits_vram = True

                # If we detected VRAM, check if model fits
                if vram is not None:
                    # heuristic: model size * 1.2 for context/overhead
                    required = size_bytes * 1.2
                    fits_vram = required < vram

                models_list.append({
                    "name": m['name'],
                    "size_bytes": size_bytes,
                    "size_gb": round(size_bytes / (1024**3), 1),
                    "fits": fits_vram
                })

            # Sort by name
            models_list.sort(key=lambda x: x['name'])

            return {"models": models_list, "vram_detected": vram is not None}
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