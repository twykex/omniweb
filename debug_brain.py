import requests
import json
import time

OLLAMA_URL = "http://localhost:11434"


def step(msg):
    print(f"\n👉 {msg}")


def test_brain():
    print("--- 🧠 OLLAMA DEEP DIAGNOSTIC ---")

    # 1. LIST AVAILABLE MODELS
    step("Checking available models...")
    try:
        res = requests.get(f"{OLLAMA_URL}/api/tags")
        if res.status_code != 200:
            print("❌ Ollama is not running. Start it first!")
            return

        models = res.json()['models']
        print(f"✅ Found {len(models)} models:")
        for i, m in enumerate(models):
            print(f"   [{i}] {m['name']}")

    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return

    # 2. SELECT MODEL
    step("Which model do you use in the terminal? (Enter the exact name or ID)")
    model_name = input("Model Name (e.g., gpt-oss:120b): ").strip()

    if not model_name:
        print("Skipping...")
        return

    # 3. TEST 1: SIMPLE HELLO (Latency Test)
    step(f"sending simple 'Hello' to {model_name}...")
    print("   (If the model is cold, this might take 30-60 seconds to load into RAM)")

    start = time.time()
    try:
        # We DO NOT use format:json here. We just want to see if it speaks.
        payload = {
            "model": model_name,
            "prompt": "Say 'System Online' and nothing else.",
            "stream": False
        }
        # Huge timeout because 120b models take forever to load
        res = requests.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=300)

        duration = time.time() - start

        if res.status_code == 200:
            reply = res.json().get('response', '').strip()
            print(f"✅ SUCCESS! Response: '{reply}'")
            print(f"⏱️ Time taken: {round(duration, 2)} seconds")
        else:
            print(f"❌ ERROR {res.status_code}: {res.text}")
            return

    except requests.exceptions.Timeout:
        print("❌ TIMEOUT: The model took longer than 300 seconds to load.")
        return
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return

    # 4. TEST 2: COMPLEX JSON (Logic Test)
    step("Testing JSON Logic Capabilities...")

    prompt = """
    You are a database. 
    Analyze the word: "Car".
    Return strict JSON only: { "children": [ { "name": "Sedan", "status": "category" } ] }
    """

    start = time.time()
    try:
        # Trying WITHOUT 'format: json' first (some models fail strict mode)
        payload = {
            "model": model_name,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.1}
        }
        res = requests.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=120)

        reply = res.json().get('response', '')
        print(f"🗣️ Raw Output:\n{reply}\n")

        if "children" in reply and "{" in reply:
            print("✅ JSON Structure Detected.")
            print("🚀 CONCLUSION: We can use this model, but we need to parse the JSON manually.")
        else:
            print("⚠️ WARNING: Model chatted instead of giving JSON.")

    except Exception as e:
        print(f"❌ Logic Test Failed: {e}")


if __name__ == "__main__":
    test_brain()
    input("\nPress Enter to exit...")