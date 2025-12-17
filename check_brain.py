import requests
import time
import sys

# CONFIG
OLLAMA_URL = "http://localhost:11434"
MODEL = "gpt-oss:120b"


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

        # Handle tags (gpt-oss:120b vs gpt-oss:120b-latest)
        if any(MODEL in m for m in models):
            print_status("MODEL", True, f"Found model: {MODEL}")
        else:
            print_status("MODEL", False, f"Model '{MODEL}' not found.")
            print(f"   Available models: {models}")
            print(f"   FIX: Run 'ollama pull {MODEL}' in terminal.")
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