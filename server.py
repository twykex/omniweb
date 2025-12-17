import json
import requests
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from config import OLLAMA_BASE
from models import ExpandRequest, AnalysisRequest, RandomTopicRequest
from utils import robust_json_parser, get_gpu_vram, get_available_models_list

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    except Exception:
        return {"models": []}


@app.post("/random")
def random_topic(req: RandomTopicRequest):
    print("\n🎲 Generating Random Topic...")
    prompt = "Generate ONE specific, engaging educational topic for a curious learner. It could be from history, science, philosophy, or technology. Avoid generic broad topics like 'Science' or 'History'. Aim for something specific like 'The Library of Alexandria', 'CRISPR Gene Editing', 'Stoicism', or 'The Antikythera Mechanism'. Return ONLY the topic name. No quotes, no extra text."

    payload = {
        "model": req.model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 1.0}
    }

    try:
        res = requests.post(f"{OLLAMA_BASE}/api/generate", json=payload, timeout=30)
        if res.status_code == 200:
            topic = res.json().get("response", "").strip().replace('"', '')
            return {"topic": topic}
    except Exception as e:
        print(f"Error generating random topic: {e}")

    return {"topic": "The Universe"}


@app.post("/expand")
def expand_node(req: ExpandRequest):
    print(f"\n⚡ Expanding Topic: [{req.node}]")

    # Use full context to ensure deep relevance
    full_context = req.context

    exclusion_text = ""
    if req.recent_nodes:
        exclusion_text = f"5. AVOID using these words/topics: {', '.join(req.recent_nodes)}"

    system_prompt_template = """
    You are an Expert Curriculum Designer.

    Current Subject: {node}
    Context Path: {context}

    Your goal is to identify 5 distinct sub-topics or learning paths that drill down into "{node}".
    These sub-topics must be strictly hierarchical children of "{node}", assuming the user has already studied the parent topics in the context path.

    RULES:
    1. Output MUST be valid, parseable JSON.
    2. Do not include any introductory text, markdown formatting, or code blocks. Just the raw JSON string.
    3. The JSON root must be an object with a single key "children" containing a list of objects.
    4. Each child object must have:
        - "name": Concise academic title (max 4 words).
        - "desc": Brief definition (max 20 words).
        - "status": One of ["concept", "entity", "process"].
    {exclusion}

    Example Output:
    {{
        "children": [
            {{ "name": "Subtopic Name", "desc": "Brief description.", "status": "concept" }},
            ...
        ]
    }}
    """

    system_prompt = system_prompt_template.format(
        node=req.node,
        context=full_context,
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

    def filter_response(data, recent_nodes):
        if not data or not isinstance(data, dict) or "children" not in data or not data["children"]:
            return None

        # Check for Forbidden Topics and Duplicates
        lower_recent = {n.lower() for n in recent_nodes} if recent_nodes else set()
        seen_names = set()
        valid_children = []

        for child in data["children"]:
            name = child.get("name", "")
            if not name:
                continue
            name_lower = name.lower()

            if name_lower in lower_recent:
                print(f"Found forbidden topic: {name}")
                continue
            if name_lower in seen_names:
                print(f"Found duplicate topic in response: {name}")
                continue

            seen_names.add(name_lower)
            valid_children.append(child)

        if not valid_children:
            return None

        data["children"] = valid_children
        return data

    data = filter_response(data, req.recent_nodes)
    if data:
        return data

    print("⚠️ Primary model failed or returned repeat topics. Attempting fallback...")

    available_models = get_available_models_list()
    # Try to find a fallback that is NOT the current model
    fallback_candidates = [m for m in available_models if m != req.model]

    for fallback_model in fallback_candidates:
        print(f"🔄 Switching to fallback model: {fallback_model}")
        data = call_llm(fallback_model, system_prompt)
        data = filter_response(data, req.recent_nodes)
        if data:
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
        "code": f"Provide a code example or technical demonstration related to '{req.node}'. If it is a programming concept, show code. If it is a scientific concept, show a formula or a simulation algorithm. Use proper markdown code blocks.",
        "proscons": f"Analyze the Pros and Cons of '{req.node}'. Present them in a clear Markdown table or list.",
        "debate": f"Simulate a short debate between two experts holding opposing views on '{req.node}'. Label them as 'Proponent' and 'Skeptic'.",
        "quiz": f"Create a {req.num_questions}-question multiple choice quiz about '{req.node}'. Difficulty: {req.difficulty}. Return ONLY valid JSON. The JSON should be an object with a key 'questions' which is a list of objects. Each question object must have: 'question' (string), 'options' (list of 4 strings), 'correct_index' (integer 0-3), and 'explanation' (string). Do not use markdown formatting."
    }

    if req.mode == "history":
        system_prompt = f"""
        You are a Historian.

        Context: {req.context}
        Topic: {req.node}

        Task: Create a historical timeline of key events for "{req.node}", considering the context "{req.context}".

        Requirements:
        1. Return ONLY a valid JSON Array.
        2. Do NOT use markdown code blocks (```json ... ```).
        3. Do NOT include any text before or after the JSON.
        4. Each element in the array must be an object with "year" (string), "title" (string), and "description" (string).

        Example:
        [
            {{ "year": "1905", "title": "Special Relativity", "description": "Einstein publishes his paper..." }}
        ]
        """
    elif req.mode == "quiz":
        difficulty_guidance = {
            "easy": "Focus on basic facts and definitions.",
            "medium": "Focus on conceptual understanding and connections.",
            "hard": "Focus on complex analysis, edge cases, and synthesis of ideas."
        }.get(req.difficulty, "Focus on conceptual understanding.")

        system_prompt = f"""
        You are a Professor creating an exam.

        Context: {req.context}
        Topic: {req.node}
        Difficulty: {req.difficulty}

        Task: Create a {req.num_questions}-question multiple choice quiz.

        Requirements:
        1. Return ONLY valid JSON.
        2. Do NOT use markdown code blocks.
        3. The root object must have a key "questions" containing a list of question objects.
        4. Each question object must have:
           - "question": The question text.
           - "options": An array of exactly 4 strings.
           - "correct_index": Integer (0-3).
           - "explanation": Brief explanation of the answer.

        Difficulty Guidance: {difficulty_guidance}
        """
    else:
        system_prompt = f"""
        You are an Expert Tutor.

        Context: {req.context}
        Topic: {req.node}
        Task: {prompts.get(req.mode)}

        Guidelines:
        - All explanations must be strictly framed within the provided Context.
        - Style: Engaging, clear, and educational.
        - Use Markdown for structure: headers (#, ##), bold (**), lists (-).
        - Do NOT simply dump information; teach the concept.

        VISUAL AIDS:
        If a specific diagram or image would help (e.g., anatomy, maps, blueprints), insert a tag on its own line:
        [Image of <specific search query>]

        Use this sparingly and only when necessary.
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
