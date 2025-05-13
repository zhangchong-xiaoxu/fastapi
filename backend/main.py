"""
Main application module for the Social Network Analysis System.
This module initializes the FastAPI application and includes all routers.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from utils.startup import start_file_monitor_thread, process_existing_files

# Initialize the FastAPI application
app = FastAPI(
    title="Social Network Analysis System",
    description="API for analyzing social network data",
    version="0.1.0",
)

# Add CORS middleware to allow cross-origin requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import API routers
from api.network import router as network_router
from api.analysis import router as analysis_router
from api.user import router as user_router
from api.activities import router as activities_router

# Include API routers
app.include_router(network_router, prefix="/api/network", tags=["Network"])
app.include_router(analysis_router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(user_router, prefix="/api/user", tags=["User"])
app.include_router(activities_router, prefix="/api/activities", tags=["Activities"])

# Ensure the data directories exist
os.makedirs("../data/input", exist_ok=True)
os.makedirs("../data/output", exist_ok=True)

# Mount static files directory if it exists
if os.path.exists("../frontend/build"):
    app.mount("/", StaticFiles(directory="../frontend/build", html=True), name="static")

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint to verify API is running."""
    return {"status": "ok", "message": "API is running"}

# Startup event handler
@app.on_event("startup")
async def startup_event():
    """Run tasks when the application starts."""
    # Process any existing files in the input directory
    process_existing_files()
    
    # Start the file monitoring thread
    monitor_thread = start_file_monitor_thread()
    if not monitor_thread:
        print("Warning: Failed to start file monitor thread")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 