#!/usr/bin/env python
"""
A script to run both the frontend and backend servers together.
"""
import os
import subprocess
import sys
import time
import platform
from threading import Thread

def run_backend():
    """Run the backend server."""
    print("Starting backend server...")
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))
    
    # Check for virtual environment and use it if available
    if os.path.exists('venv'):
        if platform.system() == 'Windows':
            python_exe = os.path.join('venv', 'Scripts', 'python.exe')
        else:
            python_exe = os.path.join('venv', 'bin', 'python')
    else:
        python_exe = sys.executable
    
    subprocess.run([python_exe, 'main.py'], check=True)

def run_frontend():
    """Run the frontend development server."""
    print("Starting frontend server...")
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend'))
    
    # Check if npm is installed
    try:
        subprocess.run(['npm', '--version'], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except (subprocess.SubprocessError, FileNotFoundError):
        print("Error: npm is not installed. Please install Node.js and npm.")
        sys.exit(1)
    
    # Start the frontend server
    subprocess.run(['npm', 'start'], check=True)

if __name__ == "__main__":
    # Start backend in a separate thread
    backend_thread = Thread(target=run_backend)
    backend_thread.daemon = True
    backend_thread.start()
    
    # Give the backend some time to start up
    time.sleep(3)
    
    try:
        # Run frontend in the main thread
        run_frontend()
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        sys.exit(0) 