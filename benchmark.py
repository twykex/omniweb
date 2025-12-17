#!/usr/bin/env python3
import requests
import json
import time
import os
import datetime
import re
from typing import List, Dict, Any

# Try to import from local modules, otherwise use defaults
try:
    from config import OLLAMA_BASE
except ImportError:
    OLLAMA_BASE = os.getenv("OLLAMA_BASE", "http://localhost:11434")

try:
    from utils import robust_json_parser
except ImportError:
    def robust_json_parser(text):
        # Simple fallback parser
        text = re.sub(r"```json", "", text, flags=re.IGNORECASE)
        text = re.sub(r"```", "", text)
        return text.strip()

# Configuration
OUTPUT_BASE_DIR = "benchmark_results"
TIMEOUT_SECONDS = 60

# Test Prompts
TEST_SUITE = [
    {
        "id": "sanity",
        "name": "Sanity Check",
        "system": "You are a helpful assistant.",
        "prompt": "Say 'hello' and nothing else.",
        "type": "text",
        "validator": lambda x: "hello" in x.lower()
    },
    {
        "id": "json_strict",
        "name": "Strict JSON Structure",
        "system": "You are a data api. Return ONLY valid JSON.",
        "prompt": """
        Return a JSON object describing a book.
        Format:
        {
            "title": "String",
            "author": "String",
            "year": Int,
            "genres": ["String", "String"]
        }
        Do not include any markdown or text outside the JSON.
        """,
        "type": "json",
        "validator": None # Will use json loader
    },
    {
        "id": "reasoning",
        "name": "Logic Puzzle",
        "system": "You are a logician.",
        "prompt": "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Explain your reasoning step by step, then answer with 'Answer: $X.XX'.",
        "type": "text",
        "validator": lambda x: "0.05" in x or "5 cents" in x
    }
]

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def get_models() -> List[str]:
    print("🔍 Scanning for models...")
    try:
        res = requests.get(f"{OLLAMA_BASE}/api/tags", timeout=5)
        if res.status_code == 200:
            data = res.json()
            models = [m['name'] for m in data.get('models', [])]
            print(f"✅ Found {len(models)} models: {', '.join(models)}")
            return models
    except Exception as e:
        print(f"❌ Error fetching models from {OLLAMA_BASE}: {e}")
        print("Please ensure Ollama is running.")
    return []

def run_test(model: str, test: Dict[str, Any]) -> Dict[str, Any]:
    print(f"    Running test: {test['name']}...", end="", flush=True)

    payload = {
        "model": model,
        "prompt": test['prompt'],
        "system": test.get('system', ""),
        "stream": False,
        "options": {
            "temperature": 0.1, # Low temp for deterministic results in benchmarks
            "num_ctx": 4096
        }
    }

    start_time = time.perf_counter()
    try:
        res = requests.post(f"{OLLAMA_BASE}/api/generate", json=payload, timeout=TIMEOUT_SECONDS)
        end_time = time.perf_counter()
        duration = end_time - start_time

        if res.status_code == 200:
            response_text = res.json().get("response", "")

            # Validation
            passed = False

            if test['type'] == 'json':
                json_text = robust_json_parser(response_text)
                try:
                    json.loads(json_text)
                    passed = True
                except:
                    passed = False
            elif test.get('validator'):
                try:
                    passed = test['validator'](response_text)
                except Exception:
                    passed = False
            else:
                passed = True # No validation, just completion

            print(f" Done ({duration:.2f}s) [{'Pass' if passed else 'Fail'}]")

            return {
                "test_id": test['id'],
                "status": "success",
                "duration": duration,
                "response": response_text,
                "passed": passed,
                "error": None
            }
        else:
            print(f" Error (HTTP {res.status_code})")
            return {
                "test_id": test['id'],
                "status": "error",
                "duration": 0,
                "response": None,
                "passed": False,
                "error": f"HTTP {res.status_code}: {res.text}"
            }

    except Exception as e:
        print(f" Error ({str(e)})")
        return {
            "test_id": test['id'],
            "status": "error",
            "duration": 0,
            "response": None,
            "passed": False,
            "error": str(e)
        }

def analyze_results(results: Dict[str, List[Dict]], timestamp: str):
    print("\n" + "="*50)
    print("📊 BENCHMARK SUMMARY")
    print("="*50)

    # Header
    print(f"{'Model':<30} | {'Valid JSON':<10} | {'Logic':<10} | {'Avg Time':<10}")
    print("-" * 70)

    recommendation_candidates = []

    for model, tests in results.items():
        json_pass = False
        logic_pass = False
        total_time = 0
        valid_tests = 0

        for t in tests:
            if t['status'] == 'success':
                total_time += t['duration']
                valid_tests += 1

                if t['test_id'] == 'json_strict':
                    json_pass = t['passed']
                if t['test_id'] == 'reasoning':
                    logic_pass = t['passed']

        avg_time = total_time / valid_tests if valid_tests > 0 else 0

        print(f"{model:<30} | {'✅' if json_pass else '❌':<10} | {'✅' if logic_pass else '❌':<10} | {avg_time:.2f}s")

        # We value JSON validity the most, then Logic, then Speed
        if json_pass:
            score = 1000
            if logic_pass:
                score += 500
            # Lower time is better, subtract time
            score -= avg_time
            recommendation_candidates.append((model, score, avg_time))

    print("="*50)

    # Recommendation
    print("\n🏆 RECOMMENDATION:")
    if not recommendation_candidates:
        print("No models passed the JSON strictness test. The website relies heavily on JSON.")
        print("Consider using a more capable model like 'mistral', 'llama3', or 'qwen2.5'.")
    else:
        # Sort by score (descending)
        recommendation_candidates.sort(key=lambda x: x[1], reverse=True)
        best_model = recommendation_candidates[0][0]
        avg_time = recommendation_candidates[0][2]
        print(f"The best model for this website appears to be: **{best_model}**")
        print(f"It passed strict JSON validation and had a good balance of speed and logic.")

        # Save recommendation to a separate file for easy reading
        with open(os.path.join(OUTPUT_BASE_DIR, f"run_{timestamp}", "recommendation.txt"), "w") as f:
            f.write(best_model)

def main():
    print("🚀 STARTING OLLAMA MODEL BENCHMARK")
    print(f"Checking {OLLAMA_BASE}...\n")

    models = get_models()
    if not models:
        return

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = os.path.join(OUTPUT_BASE_DIR, f"run_{timestamp}")
    ensure_dir(run_dir)

    all_results = {}

    for model in models:
        print(f"\n🧪 Testing Model: {model}")
        model_results = []
        for test in TEST_SUITE:
            result = run_test(model, test)
            model_results.append(result)
        all_results[model] = model_results

    # Save raw data
    with open(os.path.join(run_dir, "results.json"), "w") as f:
        json.dump(all_results, f, indent=2)

    print(f"\n💾 Results saved to {run_dir}/results.json")

    analyze_results(all_results, timestamp)

if __name__ == "__main__":
    main()
