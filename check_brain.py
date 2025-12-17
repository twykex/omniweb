import requests
import time
import sys

# CONFIG
OLLAMA_URL = "http://localhost:11434"
MODEL = "llama3"  # Default recommendation, but will auto-detect


def print_status(step, status, message):
    icon = "✅" if status else "❌"
    print(f"{icon} [{step}]: {message}")


def check_ollama():
    print(f"\n--- DIAGNOSING NEXUS BRAIN ({MODEL}) ---\n")

    # 1. CHECK SERVICE
    try:
        requests.get(OLLAMA_URL)
        print_status("SERVICE", True, "Ollama is running locally.")
    except:
        print_status("SERVICE", False, "Ollama is NOT running. Open the Ollama app first.")
        return

    # 2. CHECK MODEL PRESENCE
    try:
        response = requests.get(f"{OLLAMA_URL}/api/tags")
        models = [m['name'] for m in response.json()['models']]

        # Check if ANY model exists if specific one is not found
        found_model = next((m for m in models if MODEL in m), None)

        if found_model:
            print_status("MODEL", True, f"Found model: {found_model}")
            # Update MODEL to the one we found for inference test
            global MODEL
            MODEL = found_model
        elif models:
            print_status("MODEL", True, f"Target '{MODEL}' not found, but found '{models[0]}'. Using that.")
            MODEL = models[0]
        else:
            print_status("MODEL", False, f"No models found.")
            print(f"   FIX: Run 'ollama pull llama3' (or any other model) in terminal.")
            return
    except Exception as e:
        print_status("MODEL", False, f"Failed to list models: {e}")
        return

    # 3. TEST INFERENCE
    print("\n⏳ Testing Intelligence (Loading 120B model into VRAM... this may take 10-20s)...")
    start_time = time.time()

    try:
        payload = {
            "model": MODEL,
            "prompt": "Output the single word: ONLINE",
            "stream": False
        }
        res = requests.post(f"{OLLAMA_URL}/api/generate", json=payload)

        if res.status_code == 200:
            answer = res.json()['response'].strip()
            duration = round(time.time() - start_time, 2)

            if "ONLINE" in answer.upper():
                print_status("INFERENCE", True, f"Brain responded in {duration}s.")
                print("\n🚀 SYSTEM IS READY. YOU CAN RUN START_NEXUS.bat")
            else:
                print_status("INFERENCE", False, f"Brain gave unexpected reply: '{answer}'")
        else:
            print_status("INFERENCE", False, f"Server Error: {res.text}")

    except Exception as e:
        print_status("INFERENCE", False, f"Connection timed out or failed: {e}")


if __name__ == "__main__":
    check_ollama()
    input("\nPress Enter to exit...")