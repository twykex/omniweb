import os
import json
import requests
import re
import subprocess
import shutil
import platform
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

OLLAMA_BASE = os.getenv("OLLAMA_BASE", "http://localhost:11434")

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
    recent_nodes: List[str] = []


class AnalysisRequest(BaseModel):
    node: str
    context: str
    model: str
    mode: str
    difficulty: Optional[str] = "medium"
    num_questions: Optional[int] = 3


def robust_json_parser(text):
    text = re.sub(r"```json", "", text, flags=re.IGNORECASE)
    text = re.sub(r"```", "", text)

    # Strategy: Find the first '{' or '[' and the last '}' or ']'
    start_obj = text.find('{')
    start_arr = text.find('[')

    start = -1
    is_object = False

    if start_obj != -1 and start_arr != -1:
        if start_obj < start_arr:
            start = start_obj
            is_object = True
        else:
            start = start_arr
            is_object = False
    elif start_obj != -1:
        start = start_obj
        is_object = True
    elif start_arr != -1:
        start = start_arr
        is_object = False

    if start != -1:
        if is_object:
            end = text.rfind('}') + 1
        else:
            end = text.rfind(']') + 1

        if end > start:
            text = text[start:end]

    return text


def get_gpu_vram():
    try:
        # Check for NVIDIA GPU via nvidia-smi
        if shutil.which("nvidia-smi"):
            output = subprocess.check_output(
                ["nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits"],
                encoding="utf-8",
                timeout=5
            )
            lines = output.strip().split('\n')
            if lines:
                total_mib = int(lines[0]) # Use first GPU
                return total_mib * 1024 * 1024

        if platform.system() == "Darwin":
            output = subprocess.check_output(["sysctl", "-n", "hw.memsize"], encoding="utf-8", timeout=5)
            total_mem = int(output.strip())
            return int(total_mem * 0.75)

    except Exception:
        pass
    return None


def get_available_models_list():
    try:
        res = requests.get(f"{OLLAMA_BASE}/api/tags", timeout=2)
        if res.status_code == 200:
            data = res.json()
            return [m['name'] for m in data['models']]
        return []
    except:
        return []


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

                if vram is not None:
                    required = size_bytes * 1.2
                    fits_vram = required < vram

                models_list.append({
                    "name": m['name'],
                    "size_bytes": size_bytes,
                    "size_gb": round(size_bytes / (1024**3), 1),
                    "fits": fits_vram
                })

            models_list.sort(key=lambda x: x['name'])

            return {"models": models_list, "vram_detected": vram is not None}
        return {"models": []}
    except:
        return {"models": []}


@app.post("/expand")
def expand_node(req: ExpandRequest):
    print(f"\n⚡ Expanding Topic: [{req.node}]")

    context_parts = req.context.split(" > ")
    short_context = " > ".join(context_parts[-4:])

    exclusion_text = ""
    if req.recent_nodes:
        exclusion_text = f"4. AVOID using these words/topics: {', '.join(req.recent_nodes)}"

    system_prompt_template = """
    You are an Expert Curriculum Designer.
    Current Subject: {node} (Context: {context})

    TASK: Identify 5 distinct learning paths or sub-topics for a student studying "{node}".

    RULES:
    1. "name": Clear, academic terminology (Max 4 words). Title Case.
    2. "desc": A specific definition. (Max 20 words).
    3. "status": "concept" (theory), "entity" (person/place/thing), or "process" (action/verb).
    {exclusion}

    OUTPUT JSON:
    {{ "children": [ {{ "name": "Topic Name", "desc": "Definition.", "status": "concept" }} ] }}
    """

    system_prompt = system_prompt_template.format(
        node=req.node,
        context=short_context,
        exclusion=exclusion_text
    )

    def call_llm(model, prompt):
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": req.temperature, "num_ctx": 4096}
        }
        try:
            response = requests.post(f"{OLLAMA_BASE}/api/generate", json=payload, timeout=60)
            response.raise_for_status()
            json_text = robust_json_parser(response.json().get("response", ""))
            return json.loads(json_text)
        except Exception as e:
            print(f"Error calling {model}: {e}")
            return None

    data = call_llm(req.model, system_prompt)

    def is_valid(data, recent_nodes):
        if not data or "children" not in data or not data["children"]:
            return False

        # Check for Forbidden Topics and Duplicates
        lower_recent = {n.lower() for n in recent_nodes} if recent_nodes else set()
        seen_names = set()

        for child in data["children"]:
            name_lower = child["name"].lower()
            if name_lower in lower_recent:
                print(f"Found forbidden topic: {child['name']}")
                return False
            if name_lower in seen_names:
                print(f"Found duplicate topic in response: {child['name']}")
                return False
            seen_names.add(name_lower)

        return True

    if is_valid(data, req.recent_nodes):
        return data

    print("⚠️ Primary model failed or returned repeat topics. Attempting fallback...")

    available_models = get_available_models_list()
    # Try to find a fallback that is NOT the current model
    fallback_candidates = [m for m in available_models if m != req.model]

    for fallback_model in fallback_candidates:
        print(f"🔄 Switching to fallback model: {fallback_model}")
        data = call_llm(fallback_model, system_prompt)
        if is_valid(data, req.recent_nodes):
            return data

    return {"children": []}


@app.post("/analyze")
def analyze_node(req: AnalysisRequest):
    print(f"\n📚 Teaching [{req.node}] Mode: {req.mode}")

    prompts = {
        "explain": f"Teach '{req.node}' to a beginner. Use a clear analogy (formatted as a > blockquote) to explain the core concept. Then detail how it works.",
        "history": f"Provide a historical timeline of '{req.node}'. Return a JSON array where each element has 'year', 'title', and 'description'. Do not use Markdown or code blocks.",
        "impact": f"Analyze the significance of '{req.node}'. Why does it matter to humanity or the universe? What are the ethical or practical implications?",
        "eli5": f"Explain '{req.node}' to a 5-year-old. Use simple words and fun examples.",
        "future": f"Speculate on the future of '{req.node}'. What advances or changes can we expect in the next 50 years?",
        "quiz": f"Create a {req.num_questions}-question multiple choice quiz about '{req.node}'. Difficulty: {req.difficulty}. Return ONLY valid JSON. The JSON should be an object with a key 'questions' which is a list of objects. Each question object must have: 'question' (string), 'options' (list of 4 strings), 'correct_index' (integer 0-3), and 'explanation' (string). Do not use markdown formatting."
    }

    if req.mode == "history":
        system_prompt = f"""
        Context: {req.context}
        Topic: {req.node}
        Task: {prompts.get(req.mode)}

        Output format: Pure JSON Array. No Markdown. Do not use code blocks.
        Example: [{{ "year": "1905", "title": "Special Relativity", "description": "Einstein publishes his paper..." }}]
        """
    elif req.mode == "quiz":
        difficulty_guidance = {
            "easy": "Focus on basic facts and definitions.",
            "medium": "Focus on conceptual understanding and connections.",
            "hard": "Focus on complex analysis, edge cases, and synthesis of ideas."
        }.get(req.difficulty, "Focus on conceptual understanding.")

        system_prompt = f"""
        Context: {req.context}
        Topic: {req.node}
        Task: {prompts.get(req.mode)}

        Difficulty Guidance: {difficulty_guidance}

        Style: Engaging, Professor-like, Clear.
        Format: JSON only. Do not use Markdown code blocks.
        """
    else:
        system_prompt = f"""
        Context: {req.context}
        Topic: {req.node}
        Task: {prompts.get(req.mode)}

        Style: Engaging, Professor-like, Clear.
        Format: Markdown with headers (#, ##), bolding (**), and lists (-).
        
        VISUAL AIDS:
        If a diagram or image would significantly improve understanding (e.g., complex anatomy, mechanical systems, or specific scientific cycles), insert a tag on a new line in the format: [Image of <query>].
        - Use sparingly: Only trigger an image if it adds instructional value.
        - Be specific in the query inside the brackets.
        - Place the tag immediately before or after the relevant explanation.
        """

    payload = {
        "model": req.model,
        "prompt": system_prompt,
        "stream": True,
        "options": {"temperature": 0.6}
    }

    def generate():
        try:
            with requests.post(f"{OLLAMA_BASE}/api/generate", json=payload, stream=True, timeout=120) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if line:
                        try:
                            json_obj = json.loads(line.decode('utf-8'))
                            chunk = json_obj.get("response", "")
                            if chunk:
                                yield chunk
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            yield f"Error: {str(e)}"

    return StreamingResponse(generate(), media_type="text/plain")