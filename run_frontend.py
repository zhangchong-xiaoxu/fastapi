#!/usr/bin/env python
"""
Run script for the Social Network Analysis System frontend.
This script starts the React development server.
"""
import os
import subprocess
import sys
import platform

def main():
    """Run the React development server."""
    # Change to the frontend directory
    os.chdir('frontend')
    
    # Determine the command based on the platform
    if platform.system() == 'Windows':
        cmd = 'npm.cmd'
    else:
        cmd = 'npm'
    
    # Run the server
    try:
        subprocess.run([cmd, 'start'], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Failed to start frontend server: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print("npm not found. Make sure Node.js is installed and in your PATH.")
        sys.exit(1)

if __name__ == "__main__":
    main() 