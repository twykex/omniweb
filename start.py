#!/usr/bin/env python3
import os
import sys
import subprocess
import platform
import time
import signal
import shutil

# Configuration
REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = REPO_ROOT
FRONTEND_DIR = os.path.join(REPO_ROOT, "omniweb")
VENV_DIR = os.path.join(REPO_ROOT, ".venv")
IS_WINDOWS = platform.system() == "Windows"

def print_step(step):
    print(f"\n{'='*50}")
    print(f" {step}")
    print(f"{'='*50}\n")

def get_venv_python():
    if IS_WINDOWS:
        return os.path.join(VENV_DIR, "Scripts", "python.exe")
    else:
        return os.path.join(VENV_DIR, "bin", "python")

def get_venv_pip():
    if IS_WINDOWS:
        return os.path.join(VENV_DIR, "Scripts", "pip.exe")
    else:
        return os.path.join(VENV_DIR, "bin", "pip")

def setup_backend():
    print_step("Setting up Backend")

    # Check if venv exists
    if not os.path.exists(VENV_DIR):
        print(f"Creating virtual environment in {VENV_DIR}...")
        try:
            subprocess.check_call([sys.executable, "-m", "venv", ".venv"])
        except subprocess.CalledProcessError:
            print("Error: Failed to create virtual environment. Ensure 'python3-venv' is installed if on Linux.")
            sys.exit(1)
    else:
        print("Virtual environment already exists.")

    # Install dependencies
    pip_exe = get_venv_pip()
    req_file = os.path.join(BACKEND_DIR, "requirements.txt")
    if os.path.exists(req_file):
        print("Installing backend dependencies...")
        try:
            subprocess.check_call([pip_exe, "install", "--upgrade", "pip"], stdout=subprocess.DEVNULL)
            subprocess.check_call([pip_exe, "install", "-r", req_file])
        except subprocess.CalledProcessError as e:
            print(f"Error installing dependencies: {e}")
            sys.exit(1)
    else:
        print("Warning: requirements.txt not found.")

def setup_frontend():
    print_step("Setting up Frontend")

    if not os.path.exists(FRONTEND_DIR):
        print(f"Error: Frontend directory '{FRONTEND_DIR}' not found.")
        return

    # Check for npm
    # On Windows, shutil.which might not find npm if it's a cmd file unless checking npm.cmd
    npm_path = shutil.which("npm") or shutil.which("npm.cmd")
    if not npm_path:
         print("Error: 'npm' not found. Please install Node.js.")
         sys.exit(1)

    npm_cmd = "npm.cmd" if IS_WINDOWS else "npm"

    node_modules = os.path.join(FRONTEND_DIR, "node_modules")
    if not os.path.exists(node_modules):
        print("Installing frontend dependencies (this may take a while)...")
        try:
            # shell=IS_WINDOWS is important for npm on windows
            subprocess.check_call([npm_cmd, "install"], cwd=FRONTEND_DIR, shell=IS_WINDOWS)
        except subprocess.CalledProcessError as e:
            print(f"Error installing frontend dependencies: {e}")
            sys.exit(1)
    else:
        print("Frontend dependencies seem to be installed.")

processes = []

def cleanup():
    if not processes:
        return
    print("\nStopping services...")
    for p in processes:
        if p.poll() is None: # If still running
            try:
                # Terminate properly
                p.terminate()
                try:
                    p.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    print(f"Force killing process {p.pid}...")
                    p.kill()
            except Exception as e:
                print(f"Error stopping process: {e}")
    print("Stopped.")

def signal_handler(sig, frame):
    cleanup()
    sys.exit(0)

def start_services():
    print_step("Starting Services")

    # 1. Start Backend
    print("Launching Backend...")
    python_exe = get_venv_python()
    # Using python -m uvicorn allows uvicorn to be found in the venv
    backend_cmd = [python_exe, "-m", "uvicorn", "server:app", "--reload", "--host", "127.0.0.1", "--port", "8000"]

    backend_proc = subprocess.Popen(backend_cmd, cwd=BACKEND_DIR)
    processes.append(backend_proc)

    # Give backend a moment to initialize? Not strictly necessary but nice.
    time.sleep(1)

    # 2. Start Frontend
    print("Launching Frontend...")
    npm_cmd = "npm.cmd" if IS_WINDOWS else "npm"
    frontend_cmd = [npm_cmd, "start"]

    # Run npm start
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=FRONTEND_DIR, shell=IS_WINDOWS)
    processes.append(frontend_proc)

    print("\nAll systems go! Press Ctrl+C to stop.\n")

    try:
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None:
                print("Backend exited unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print("Frontend exited unexpectedly.")
                break
    except KeyboardInterrupt:
        pass # cleanup called in finally
    finally:
        cleanup()

def main():
    # Handle arguments
    if len(sys.argv) > 1 and sys.argv[1] == "--setup-only":
        setup_backend()
        setup_frontend()
        print("Setup complete.")
        return

    setup_backend()
    setup_frontend()

    # Set up signal handling
    signal.signal(signal.SIGINT, signal_handler)
    if not IS_WINDOWS:
        signal.signal(signal.SIGTERM, signal_handler)

    start_services()

if __name__ == "__main__":
    main()
