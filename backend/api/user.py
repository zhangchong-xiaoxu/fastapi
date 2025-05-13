"""
User API router for the Social Network Analysis System.
Provides endpoints for user settings and preferences.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from sqlalchemy.orm import Session
from models.database import get_db, User, AnalysisHistory

router = APIRouter()

class UserPreferences(BaseModel):
    """Model for user preferences."""
    visualization_settings: Dict[str, Any] = {}
    analysis_defaults: Dict[str, Any] = {}
    theme: str = "light"

@router.get("/preferences")
async def get_preferences(db: Session = Depends(get_db)):
    """
    Get user preferences.
    
    Returns:
        dict: User preferences.
    """
    try:
        # For now, we just use a default user (ID 1)
        # In a real system with authentication, we would get the current user ID
        user = db.query(User).filter(User.id == 1).first()
        
        # If user doesn't exist, create one with default preferences
        if not user:
            default_prefs = {
                "visualization_settings": {
                    "node_size": 10,
                    "edge_width": 2,
                    "show_labels": True
                },
                "analysis_defaults": {
                    "centrality_algorithm": "betweenness",
                    "community_algorithm": "louvain"
                },
                "theme": "light"
            }
            
            user = User(
                username="default_user",
                preferences=default_prefs
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            return default_prefs
        
        # Return the user's preferences
        return user.preferences
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve preferences: {str(e)}")

@router.post("/preferences")
async def save_preferences(preferences: UserPreferences, db: Session = Depends(get_db)):
    """
    Save user preferences.
    
    Args:
        preferences: User preferences to save.
        
    Returns:
        dict: Success message.
    """
    try:
        # For now, we just use a default user (ID 1)
        user = db.query(User).filter(User.id == 1).first()
        
        # If user doesn't exist, create one
        if not user:
            user = User(
                username="default_user",
                preferences=preferences.dict()
            )
            db.add(user)
        else:
            # Update existing user's preferences
            user.preferences = preferences.dict()
        
        db.commit()
        db.refresh(user)
        
        return {"status": "success", "message": "Preferences saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save preferences: {str(e)}")

@router.get("/history")
async def get_analysis_history(db: Session = Depends(get_db)):
    """
    Get analysis history.
    
    Returns:
        list: History of analyses performed by the user.
    """
    try:
        # Get analysis history for the default user
        # In a real system with authentication, we would filter by the current user's ID
        history_items = db.query(AnalysisHistory).order_by(AnalysisHistory.created_at.desc()).limit(10).all()
        
        # Format the results
        result = []
        for item in history_items:
            result.append({
                "id": f"analysis-{item.id}",
                "type": item.analysis_type,
                "algorithm": item.algorithm,
                "date": item.created_at.isoformat()
            })
        
        # If no history exists yet, return placeholder data
        if not result:
            return [
                {
                    "id": "analysis-1",
                    "type": "centrality",
                    "algorithm": "betweenness",
                    "date": "2023-06-01T10:30:00Z"
                },
                {
                    "id": "analysis-2",
                    "type": "community_detection",
                    "algorithm": "louvain",
                    "date": "2023-06-02T15:45:00Z"
                }
            ]
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve analysis history: {str(e)}") 