#!/usr/bin/env python
"""
Run script for the Social Network Analysis System backend.
This script starts the FastAPI server.
"""
import os
import sys
import uvicorn

def main():
    """Run the FastAPI server."""
    # Change to the backend directory
    os.chdir('backend')
    
    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    main() 