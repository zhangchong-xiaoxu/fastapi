"""
Simplified application for testing SQLAlchemy and other dependencies.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Initialize the FastAPI application
app = FastAPI(
    title="Social Network Analysis System - Simplified",
    description="Simplified API for testing",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint to verify API is running."""
    return {"status": "ok", "message": "Simplified API is running"}

# Test route for SQLAlchemy
@app.get("/test-db", tags=["Test"])
async def test_database():
    """Test SQLAlchemy setup."""
    try:
        from sqlalchemy import create_engine, MetaData
        
        # Create a simple engine to test SQLAlchemy
        engine = create_engine("sqlite:///:memory:")
        metadata = MetaData()
        
        return {
            "status": "ok", 
            "message": "SQLAlchemy initialized successfully", 
            "version": getattr(engine, "driver_version", "unknown")
        }
    except Exception as e:
        return {"status": "error", "message": f"SQLAlchemy initialization failed: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("simplified_app:app", host="0.0.0.0", port=8000, reload=True) 