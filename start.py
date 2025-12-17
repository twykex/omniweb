#!/usr/bin/env python3
import argparse
import os
import platform
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

# Configuration
REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = REPO_ROOT
FRONTEND_DIR = os.path.join(REPO_ROOT, "omniweb")
VENV_DIR = os.path.join(REPO_ROOT, ".venv")
IS_WINDOWS = platform.system() == "Windows"
OLLAMA_URL = "http://localhost:11434"

# ANSI Colors
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

    @staticmethod
    def print(msg, color=ENDC, bold=False, end='\n'):
        if IS_WINDOWS:
            os.system('color') # Enables ANSI in cmd
        style = color
        if bold:
            style += Colors.BOLD
        print(f"{style}{msg}{Colors.ENDC}", end=end)

    @staticmethod
    def step(msg):
        print()
        Colors.print(f"==> {msg}", Colors.OKBLUE, bold=True)

    @staticmethod
    def success(msg):
        Colors.print(f"✓ {msg}", Colors.OKGREEN)

    @staticmethod
    def error(msg):
        Colors.print(f"✗ {msg}", Colors.FAIL, bold=True)

    @staticmethod
    def warning(msg):
        Colors.print(f"! {msg}", Colors.WARNING)

def print_banner():
    banner = r"""
  _   _  ______  __   __  _    _    _____
 | \ | ||  ____| \ \ / / | |  | |  / ____|
 |  \| || |__     \ V /  | |  | | | (___
 | . ` ||  __|     > <   | |  | |  \___ \
 | |\  || |____   / . \  | |__| |  ____) |
 |_| \_||______| /_/ \_\  \____/  |_____/

         NEXUS LAUNCH SYSTEM v2.0
    """
    Colors.print(banner, Colors.OKCYAN, bold=True)

def check_port(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex((host, port)) == 0

def wait_for_port(host, port, timeout=30):
    start_time = time.time()
    while time.time() - start_time < timeout:
        if check_port(host, port):
            return True
        time.sleep(0.5)
    return False

def check_ollama():
    Colors.step("Checking Ollama Connection")
    try:
        # Just check the tag endpoint to see if it responds
        req = Request(f"{OLLAMA_URL}/api/tags")
        with urlopen(req, timeout=2) as response:
            if response.status == 200:
                Colors.success("Ollama is running and accessible.")
                return True
            else:
                Colors.warning(f"Ollama responded with status code: {response.status}")
                return False
    except (URLError, HTTPError, ConnectionRefusedError):
        Colors.warning("Ollama is NOT running or not accessible at localhost:11434.")
        Colors.print("  Note: The system requires Ollama to function correctly.", Colors.WARNING)
        return False
    except Exception as e:
        Colors.warning(f"Error checking Ollama: {e}")
        return False

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
    Colors.step("Setting up Backend")

    if not os.path.exists(VENV_DIR):
        Colors.print("Creating virtual environment...", Colors.OKBLUE)
        try:
            subprocess.check_call([sys.executable, "-m", "venv", ".venv"])
            Colors.success("Virtual environment created.")
        except subprocess.CalledProcessError:
            Colors.error("Failed to create virtual environment.")
            sys.exit(1)
    else:
        Colors.print("Virtual environment exists.", Colors.OKGREEN)

    pip_exe = get_venv_pip()
    req_file = os.path.join(BACKEND_DIR, "requirements.txt")

    if os.path.exists(req_file):
        Colors.print("Checking backend dependencies...", Colors.OKBLUE)
        try:
            subprocess.check_call([pip_exe, "install", "-r", req_file], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            Colors.success("Backend dependencies installed.")
        except subprocess.CalledProcessError as e:
            Colors.error(f"Error installing dependencies: {e}")
            sys.exit(1)
    else:
        Colors.warning("requirements.txt not found.")

def setup_frontend():
    Colors.step("Setting up Frontend")

    if not os.path.exists(FRONTEND_DIR):
        Colors.error(f"Frontend directory '{FRONTEND_DIR}' not found.")
        return

    npm_cmd = "npm.cmd" if IS_WINDOWS else "npm"

    # Check if npm is installed
    if not shutil.which(npm_cmd) and not shutil.which("npm"):
        Colors.error("npm is not found. Please install Node.js.")
        sys.exit(1)

    node_modules = os.path.join(FRONTEND_DIR, "node_modules")
    if not os.path.exists(node_modules):
        Colors.print("Installing frontend dependencies (this may take a while)...", Colors.OKBLUE)
        try:
            subprocess.check_call([npm_cmd, "install"], cwd=FRONTEND_DIR, shell=IS_WINDOWS)
            Colors.success("Frontend dependencies installed.")
        except subprocess.CalledProcessError as e:
            Colors.error(f"Error installing frontend dependencies: {e}")
            sys.exit(1)
    else:
        Colors.print("Frontend dependencies seem to be installed.", Colors.OKGREEN)

def start_services(args):
    processes = []

    # Define ports
    backend_port = args.port_backend
    frontend_port = args.port_frontend
    host = args.host

    # Check ports availability
    if not args.backend_only and check_port(host, frontend_port):
        Colors.warning(f"Port {frontend_port} is already in use. Frontend might fail to start.")

    if not args.frontend_only and check_port(host, backend_port):
        Colors.warning(f"Port {backend_port} is already in use. Backend might fail to start.")

    # Start Backend
    if not args.frontend_only:
        Colors.step("Launching Backend")
        python_exe = get_venv_python()
        backend_cmd = [python_exe, "-m", "uvicorn", "server:app", "--reload", "--host", host, "--port", str(backend_port)]

        try:
            backend_proc = subprocess.Popen(backend_cmd, cwd=BACKEND_DIR)
            processes.append(backend_proc)
            Colors.success(f"Backend started on http://{host}:{backend_port}")
        except Exception as e:
            Colors.error(f"Failed to start backend: {e}")

    # Start Frontend
    if not args.backend_only:
        Colors.step("Launching Frontend")
        npm_cmd = "npm.cmd" if IS_WINDOWS else "npm"

        env = os.environ.copy()
        env["PORT"] = str(frontend_port)
        # BROWSER=none prevents CRA from opening browser immediately, we handle it manually
        env["BROWSER"] = "none"

        frontend_cmd = [npm_cmd, "start"]

        try:
            # We want to pipe stdout to devnull to reduce noise, but stderr is useful.
            # Or maybe just let it stream. The user might want to see webpack output.
            # Let's keep it visible.
            frontend_proc = subprocess.Popen(frontend_cmd, cwd=FRONTEND_DIR, env=env, shell=IS_WINDOWS)
            processes.append(frontend_proc)
            Colors.success(f"Frontend started on http://localhost:{frontend_port}")
        except Exception as e:
            Colors.error(f"Failed to start frontend: {e}")

    # Open Browser
    if not args.no_browser and not args.backend_only:
        Colors.step("Opening Browser")
        def open_browser_task():
            # Wait for frontend to be ready
            Colors.print("Waiting for frontend to be ready...", Colors.OKBLUE)
            if wait_for_port("localhost", frontend_port, timeout=60):
                url = f"http://localhost:{frontend_port}"
                Colors.print(f"Opening {url} ...", Colors.OKGREEN)
                webbrowser.open(url)
            else:
                Colors.warning("Timed out waiting for frontend port.")

        thread = threading.Thread(target=open_browser_task)
        thread.daemon = True
        thread.start()

    Colors.print("\n" + "="*50, Colors.OKCYAN)
    Colors.print(" NEXUS IS RUNNING", Colors.OKCYAN, bold=True)
    Colors.print(" Press Ctrl+C to stop all services.", Colors.OKCYAN)
    Colors.print("="*50 + "\n", Colors.OKCYAN)

    try:
        while True:
            time.sleep(1)
            # Check if processes are alive
            for p in processes:
                if p.poll() is not None:
                    Colors.error("A service has exited unexpectedly.")
                    raise KeyboardInterrupt # Trigger cleanup
    except KeyboardInterrupt:
        Colors.print("\nStopping services...", Colors.WARNING)
    finally:
        for p in processes:
            if p.poll() is None:
                p.terminate()
                try:
                    p.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    p.kill()
        Colors.print("All services stopped.", Colors.OKGREEN)

def main():
    parser = argparse.ArgumentParser(description="NEXUS Start Script")
    parser.add_argument("--skip-setup", action="store_true", help="Skip dependency installation checks")
    parser.add_argument("--backend-only", action="store_true", help="Run only the backend")
    parser.add_argument("--frontend-only", action="store_true", help="Run only the frontend")
    parser.add_argument("--setup-only", action="store_true", help="Run setup steps and exit")
    parser.add_argument("--check-brain", action="store_true", help="Run the deep diagnostic tool check_brain.py")
    parser.add_argument("--no-browser", action="store_true", help="Do not open the browser automatically")
    parser.add_argument("--port-backend", type=int, default=8000, help="Port for the backend (default: 8000)")
    parser.add_argument("--port-frontend", type=int, default=3000, help="Port for the frontend (default: 3000)")
    parser.add_argument("--host", default="127.0.0.1", help="Host for the backend (default: 127.0.0.1)")

    args = parser.parse_args()

    print_banner()

    if args.check_brain:
        Colors.step("Running Brain Diagnostics")
        subprocess.call([sys.executable, "check_brain.py"])
        return

    # Pre-flight checks
    if not args.skip_setup:
        # Check Ollama
        check_ollama()

        if not args.frontend_only:
            setup_backend()

        if not args.backend_only:
            setup_frontend()

    if args.setup_only:
        Colors.success("Setup complete.")
        return

    start_services(args)

if __name__ == "__main__":
    main()
