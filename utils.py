import re
import json
import shutil
import subprocess
import platform
import requests
from config import OLLAMA_BASE

def robust_json_parser(text):
    # Find the first brace/bracket
    start_obj = text.find('{')
    start_arr = text.find('[')

    # Early exit if no JSON structure is found
    if start_obj == -1 and start_arr == -1:
        return text

    start = -1
    if start_obj != -1 and start_arr != -1:
        start = min(start_obj, start_arr)
    elif start_obj != -1:
        start = start_obj
    elif start_arr != -1:
        start = start_arr

    stack = []
    in_string = False
    escape = False

    for i in range(start, len(text)):
        char = text[i]

        if escape:
            escape = False
            continue

        if char == '\\':
            escape = True
            continue

        if char == '"':
            in_string = not in_string
            continue

        if not in_string:
            if char == '{':
                stack.append('{')
            elif char == '[':
                stack.append('[')
            elif char == '}':
                if stack and stack[-1] == '{':
                    stack.pop()
                    if not stack:
                        return text[start:i+1]
            elif char == ']':
                if stack and stack[-1] == '[':
                    stack.pop()
                    if not stack:
                        return text[start:i+1]

    # Fallback: if we didn't find a clean end, revert to the "last brace" strategy as a last resort
    if start != -1:
        try:
            # Attempt to parse one valid JSON object starting from 'start'
            # raw_decode returns (obj, end_index)
            _, end = json.JSONDecoder().raw_decode(text, idx=start)
            return text[start:end]
        except json.JSONDecodeError:
            pass

    # Fallback to simple extraction if robust parsing fails
    # This might return invalid JSON if multiple objects exist, but it's a best effort
    if start != -1:
        end_obj = text.rfind('}') + 1
        end_arr = text.rfind(']') + 1
        end = max(end_obj, end_arr)

        if end > start:
            return text[start:end]

    return text


_GPU_VRAM_CACHE = None

def get_gpu_vram():
    global _GPU_VRAM_CACHE
    if _GPU_VRAM_CACHE is not None:
        return _GPU_VRAM_CACHE

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
                _GPU_VRAM_CACHE = total_mib * 1024 * 1024
                return _GPU_VRAM_CACHE

        if platform.system() == "Darwin":
            try:
                # Check for Apple Silicon (returns 1 if true)
                is_arm = subprocess.check_output(["sysctl", "-n", "hw.optional.arm64"], encoding="utf-8").strip() == "1"
            except Exception:
                is_arm = False

            output = subprocess.check_output(["sysctl", "-n", "hw.memsize"], encoding="utf-8", timeout=5)
            total_mem = int(output.strip())

            if is_arm:
                # Unified memory on Apple Silicon
                _GPU_VRAM_CACHE = int(total_mem * 0.75)
                return _GPU_VRAM_CACHE
            else:
                # Intel Mac (Integrated or Discrete) - detection is complex, better to return None
                return None

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
    except Exception:
        return []
