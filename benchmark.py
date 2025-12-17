#!/usr/bin/env python3
import requests
import json
import time
import os
import datetime
import re
from typing import List, Dict, Any, Optional

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
TIMEOUT_SECONDS = 90  # Increased for potentially slower code generation/summarization

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
        "validator": lambda x: "0.05" in x or "5 cents" in x or "$0.05" in x
    },
    {
        "id": "code_python",
        "name": "Python Coding",
        "system": "You are a Python expert.",
        "prompt": "Write a Python function named `calculate_factorial` that takes an integer `n` and returns the factorial of `n`. Return ONLY the code.",
        "type": "text",
        "validator": lambda x: "def calculate_factorial" in x and "return" in x
    },
    {
        "id": "summarization",
        "name": "Summarization",
        "system": "You are a helpful assistant.",
        "prompt": """Summarize the following text in exactly one sentence:
        The Internet is a global system of interconnected computer networks that uses the Internet protocol suite (TCP/IP) to communicate between networks and devices. It is a network of networks that consists of private, public, academic, business, and government networks of local to global scope, linked by a broad array of electronic, wireless, and optical networking technologies. The Internet carries a vast range of information resources and services, such as the inter-linked hypertext documents and applications of the World Wide Web (WWW), electronic mail, telephony, and file sharing.
        """,
        "type": "text",
        "validator": lambda x: len(x.strip()) > 10 and len(x.strip()) < 500
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
            data = res.json()
            response_text = data.get("response", "")
            eval_count = data.get("eval_count", 0)
            eval_duration = data.get("eval_duration", 0) # in nanoseconds

            tokens_per_second = 0
            if eval_duration > 0:
                tokens_per_second = eval_count / (eval_duration / 1e9)

            # Validation
            passed = False
            error_msg = None

            if test['type'] == 'json':
                json_text = robust_json_parser(response_text)
                try:
                    json.loads(json_text)
                    passed = True
                except json.JSONDecodeError as e:
                    passed = False
                    error_msg = f"JSON Error: {str(e)}"
            elif test.get('validator'):
                try:
                    passed = test['validator'](response_text)
                    if not passed:
                        error_msg = "Validator returned False"
                except Exception as e:
                    passed = False
                    error_msg = f"Validator Error: {str(e)}"
            else:
                passed = True # No validation, just completion

            print(f" Done ({duration:.2f}s, {tokens_per_second:.1f} t/s) [{'Pass' if passed else 'Fail'}]")

            return {
                "test_id": test['id'],
                "status": "success",
                "duration": duration,
                "response": response_text,
                "passed": passed,
                "tokens_per_second": tokens_per_second,
                "eval_count": eval_count,
                "error": error_msg
            }
        else:
            print(f" Error (HTTP {res.status_code})")
            return {
                "test_id": test['id'],
                "status": "error",
                "duration": 0,
                "response": None,
                "passed": False,
                "tokens_per_second": 0,
                "eval_count": 0,
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
            "tokens_per_second": 0,
            "eval_count": 0,
            "error": str(e)
        }

def analyze_results(results: Dict[str, List[Dict]], timestamp: str) -> List[tuple]:
    print("\n" + "="*80)
    print("📊 BENCHMARK SUMMARY")
    print("="*80)

    # Header
    print(f"{'Model':<20} | {'JSON':<5} | {'Logic':<5} | {'Code':<5} | {'Summ':<5} | {'Avg T/s':<8} | {'Avg Lat':<8}")
    print("-" * 90)

    recommendation_candidates = []

    for model, tests in results.items():
        pass_map = {t['test_id']: t['passed'] for t in tests if t['status'] == 'success'}

        json_pass = pass_map.get('json_strict', False)
        logic_pass = pass_map.get('reasoning', False)
        code_pass = pass_map.get('code_python', False)
        summ_pass = pass_map.get('summarization', False)

        valid_tests = [t for t in tests if t['status'] == 'success']
        if valid_tests:
            avg_tps = sum(t.get('tokens_per_second', 0) for t in valid_tests) / len(valid_tests)
            avg_lat = sum(t['duration'] for t in valid_tests) / len(valid_tests)
        else:
            avg_tps = 0
            avg_lat = 0

        print(f"{model:<20} | {'✅' if json_pass else '❌':<5} | {'✅' if logic_pass else '❌':<5} | {'✅' if code_pass else '❌':<5} | {'✅' if summ_pass else '❌':<5} | {avg_tps:.1f} t/s  | {avg_lat:.2f}s")

        # Scoring Logic
        # JSON is critical (weight 1000)
        # Logic is important (weight 500)
        # Code is bonus (weight 200)
        # Summarization is bonus (weight 100)
        # Speed: + 10 * tokens/sec

        if json_pass:
            score = 1000
            if logic_pass: score += 500
            if code_pass: score += 200
            if summ_pass: score += 100
            score += (avg_tps * 10)
            recommendation_candidates.append((model, score, avg_tps))

    print("="*80)

    # Recommendation
    print("\n🏆 RECOMMENDATION:")
    if not recommendation_candidates:
        print("No models passed the JSON strictness test. The website relies heavily on JSON.")
        print("Consider using a more capable model like 'mistral', 'llama3', or 'qwen2.5'.")
    else:
        # Sort by score (descending)
        recommendation_candidates.sort(key=lambda x: x[1], reverse=True)
        best_model = recommendation_candidates[0][0]
        best_tps = recommendation_candidates[0][2]
        print(f"The best model for this website appears to be: **{best_model}**")
        print(f"It passed strict JSON validation and had the highest composite score (incl. {best_tps:.1f} t/s).")

        # Save recommendation
        with open(os.path.join(OUTPUT_BASE_DIR, f"run_{timestamp}", "recommendation.txt"), "w") as f:
            f.write(best_model)

    return recommendation_candidates

def generate_report(results: Dict[str, List[Dict]], candidates: List[tuple], run_dir: str):
    report_path = os.path.join(run_dir, "REPORT.md")

    with open(report_path, "w") as f:
        f.write("# 📊 Ollama Benchmark Report\n\n")
        f.write(f"**Date:** {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

        if candidates:
            best_model = candidates[0][0]
            f.write(f"## 🏆 Recommended Model: **{best_model}**\n\n")
        else:
            f.write("## ⚠️ No Recommended Model Found\n\n")

        f.write("## Summary Table\n\n")
        f.write("| Model | JSON Strict | Logic Puzzle | Python Code | Summarization | Avg Tokens/s | Avg Latency |\n")
        f.write("|---|---|---|---|---|---|---|\n")

        for model, tests in results.items():
            pass_map = {t['test_id']: t['passed'] for t in tests if t['status'] == 'success'}
            valid_tests = [t for t in tests if t['status'] == 'success']

            if valid_tests:
                avg_tps = sum(t.get('tokens_per_second', 0) for t in valid_tests) / len(valid_tests)
                avg_lat = sum(t['duration'] for t in valid_tests) / len(valid_tests)
            else:
                avg_tps = 0
                avg_lat = 0

            json_icon = '✅' if pass_map.get('json_strict') else '❌'
            logic_icon = '✅' if pass_map.get('reasoning') else '❌'
            code_icon = '✅' if pass_map.get('code_python') else '❌'
            summ_icon = '✅' if pass_map.get('summarization') else '❌'

            f.write(f"| {model} | {json_icon} | {logic_icon} | {code_icon} | {summ_icon} | {avg_tps:.2f} | {avg_lat:.2f}s |\n")

        f.write("\n## Detailed Results\n")

        for model, tests in results.items():
            f.write(f"\n### Model: {model}\n")
            for t in tests:
                icon = '✅' if t['passed'] else '❌'
                f.write(f"- **{t['test_id']}**: {icon}\n")
                if not t['passed'] and t.get('error'):
                     f.write(f"  - Error: {t['error']}\n")
                f.write(f"  - Duration: {t['duration']:.2f}s\n")
                if t.get('tokens_per_second'):
                    f.write(f"  - Speed: {t['tokens_per_second']:.2f} t/s\n")

    print(f"\n📄 Detailed report generated at: {report_path}")

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

    candidates = analyze_results(all_results, timestamp)
    generate_report(all_results, candidates, run_dir)

if __name__ == "__main__":
    main()
