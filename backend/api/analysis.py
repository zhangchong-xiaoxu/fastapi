"""
Analysis API router for the Social Network Analysis System.
Provides endpoints for network analysis functionality.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from models.database import get_db, AnalysisHistory
from analysis.network_analysis import NetworkAnalyzer
import os
import glob
import datetime
import networkx as nx
import numpy as np
from analysis.network_analysis import (
    calculate_centrality,
    detect_communities,
    calculate_network_metrics
)
from models.gnn import (
    train_link_prediction_model, 
    predict_new_links, 
    NetworkDataProcessor,
    GNNUserBehaviorPredictor,
    train_user_behavior_prediction_model_optimized,
    predict_user_activity_optimized,
    GNNScalablePredictor,
    ModelManager
)
import torch
import torch.nn.functional as F

router = APIRouter()

class AnalysisRequest(BaseModel):
    """Model for analysis request parameters."""
    algorithm: str
    parameters: Dict[str, Any] = {}

class AnalysisResult(BaseModel):
    """Model for analysis results."""
    result_type: str
    data: Dict[str, Any]

# Output directory for processed data
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/output'))
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_latest_network_file():
    """
    Get the path to the most recent network data file.
    
    Returns:
        str: Path to the latest network file or None if not found.
    """
    network_files = glob.glob(os.path.join(OUTPUT_DIR, '*_processed.json'))
    if not network_files:
        return None
    return max(network_files, key=os.path.getmtime)

@router.post("/centrality")
async def calculate_centrality(params: AnalysisRequest, db: Session = Depends(get_db)):
    """
    Calculate centrality measures for network nodes.
    
    Args:
        params: Analysis parameters including algorithm type.
        
    Returns:
        dict: Centrality values for each node.
    """
    try:
        # Get the latest network file
        network_file = get_latest_network_file()
        if not network_file:
            raise HTTPException(status_code=404, detail="No network data found")
        
        # Load the network
        G = NetworkAnalyzer.load_network_from_json(network_file)
        if not G:
            raise HTTPException(status_code=500, detail="Failed to load network data")
        
        # Calculate centrality
        centrality = NetworkAnalyzer.calculate_centrality(G, params.algorithm)
        
        # Save analysis history to database
        history = AnalysisHistory(
            analysis_type="centrality",
            algorithm=params.algorithm,
            parameters=params.parameters
        )
        db.add(history)
        db.commit()
        
        # Save result to file (optional)
        filename = os.path.basename(network_file).split('_')[0]
        NetworkAnalyzer.save_analysis_result(
            {"result_type": "centrality", "algorithm": params.algorithm, "data": centrality},
            "centrality",
            filename
        )
        
        return {
            "result_type": "centrality",
            "algorithm": params.algorithm,
            "data": centrality
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate centrality: {str(e)}")

@router.post("/community_detection")
async def detect_communities(params: AnalysisRequest, db: Session = Depends(get_db)):
    """
    Detect communities in the network.
    
    Args:
        params: Analysis parameters including algorithm type.
        
    Returns:
        dict: Community assignments for each node.
    """
    try:
        # Get the latest network file
        network_file = get_latest_network_file()
        if not network_file:
            raise HTTPException(status_code=404, detail="No network data found")
        
        # Load the network
        G = NetworkAnalyzer.load_network_from_json(network_file)
        if not G:
            raise HTTPException(status_code=500, detail="Failed to load network data")
        
        # Detect communities
        communities = NetworkAnalyzer.detect_communities(G, params.algorithm)
        
        # Save analysis history to database
        history = AnalysisHistory(
            analysis_type="community_detection",
            algorithm=params.algorithm,
            parameters=params.parameters
        )
        db.add(history)
        db.commit()
        
        # Save result to file (optional)
        filename = os.path.basename(network_file).split('_')[0]
        NetworkAnalyzer.save_analysis_result(
            {"result_type": "communities", "algorithm": params.algorithm, "data": communities},
            "communities",
            filename
        )
        
        return {
            "result_type": "communities",
            "algorithm": params.algorithm,
            "data": communities
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to detect communities: {str(e)}")

@router.post("/predict-links", response_model=List[Dict[str, Any]])
async def predict_links(
    network_data: Dict[str, Any],
    top_k: int = Query(10, description="Number of top predictions to return")
):
    """
    Predict potential new links in the network using GNN model
    
    Returns a list of predicted links with their probability scores
    """
    try:
        # Convert input data to NetworkX graph
        G = nx.Graph()
        
        # Add nodes
        for node in network_data.get("nodes", []):
            node_id = node.get("id")
            G.add_node(node_id, **{k: v for k, v in node.items() if k != "id"})
        
        # Add edges
        for edge in network_data.get("edges", []):
            source = edge.get("source")
            target = edge.get("target")
            G.add_edge(source, target, **{k: v for k, v in edge.items() if k not in ["source", "target"]})
        
        # Check if graph is valid
        if len(G.nodes()) == 0 or len(G.edges()) == 0:
            raise HTTPException(status_code=400, detail="Invalid network data: empty graph")
        
        # Train model
        model = train_link_prediction_model(G, epochs=50)
        
        # Predict new links
        predicted_links = predict_new_links(G, model, top_k=top_k)
        
        # Format results
        results = []
        for source, target, score in predicted_links:
            results.append({
                "source": source,
                "target": target,
                "probability": score
            })
        
        return results
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error predicting links: {str(e)}")

@router.post("/predict-user-activity", response_model=List[Dict[str, Any]])
async def predict_user_activity(
    network_data: Dict[str, Any],
    top_k: int = Query(10, description="Number of top predictions to return"),
    use_optimized: bool = Query(True, description="Whether to use the optimized prediction method"),
    use_sage: bool = Query(True, description="Whether to use GraphSAGE for large networks"),
    save_model: bool = Query(True, description="Whether to save the trained model")
):
    """
    Predict user activity levels based on network structure using GNN model
    
    Returns a list of users with their predicted activity scores
    """
    try:
        # Convert input data to NetworkX graph
        G = nx.Graph()
        
        # Add nodes with any available features
        for node in network_data.get("nodes", []):
            node_id = node.get("id")
            G.add_node(node_id, **{k: v for k, v in node.items() if k != "id"})
        
        # Add edges
        for edge in network_data.get("edges", []):
            source = edge.get("source")
            target = edge.get("target")
            # Handle edge data formats that might be nested
            if isinstance(source, dict):
                source = source.get("id")
            if isinstance(target, dict):
                target = target.get("id")
            G.add_edge(source, target, **{k: v for k, v in edge.items() if k not in ["source", "target"]})
        
        # Check if graph is valid
        if len(G.nodes()) == 0 or len(G.edges()) == 0:
            raise HTTPException(status_code=400, detail="Invalid network data: empty graph")
        
        # Log network size for monitoring
        print(f"Received network with {len(G.nodes())} nodes and {len(G.edges())} edges")
        
        # Check if we should use optimized approach for large networks
        if use_optimized or len(G.nodes()) > 1000:
            print("Using optimized approach for user activity prediction")
            
            # Generate a unique identifier for this graph based on size and connectivity
            # This is used to load/save models specific to this graph structure
            graph_hash = hash(frozenset(G.edges())) % 10000
            model_identifier = f"n{len(G.nodes())}_e{len(G.edges())}_{graph_hash}"
            
            # Check if we have a saved model for a similar graph
            model_path = ModelManager.get_model_path("user_behavior", model_identifier)
            mapping_path = ModelManager.get_mapping_path("user_behavior", model_identifier)
            
            if os.path.exists(model_path) and os.path.exists(mapping_path):
                print(f"Found existing model for similar graph: {model_path}")
                results = predict_user_activity_optimized(
                    G, 
                    model_path=model_path,
                    mapping_path=mapping_path,
                    top_k=top_k
                )
            else:
                print("Training new model for graph")
                # For large graphs, we use fewer epochs to ensure responsiveness
                epochs = 30 if len(G.nodes()) > 5000 else 50
                
                try:
                    # Train model
                    model, node_mapping = train_user_behavior_prediction_model_optimized(
                        G, 
                        epochs=epochs,
                        use_sage=use_sage,
                        save_model=save_model,
                        model_identifier=model_identifier
                    )
                    
                    # Predict user activity
                    results = predict_user_activity_optimized(
                        G, 
                        model=model,
                        node_mapping=node_mapping,
                        top_k=top_k
                    )
                except Exception as e:
                    print(f"Error in optimized prediction: {str(e)}")
                    # Fall back to simple prediction
                    results = predict_user_activity_optimized(G, top_k=top_k)
        else:
            try:
                # Use original approach for smaller networks
                print("Using standard approach for user activity prediction")
                
                # Use the optimized prediction function with simpler parameters
                results = predict_user_activity_optimized(G, top_k=top_k)
            except Exception as e:
                print(f"Error in standard prediction: {str(e)}")
                # Use degree centrality as ultimate fallback
                centrality = nx.degree_centrality(G)
                results = []
                for node, score in centrality.items():
                    results.append({
                        "id": node,
                        "name": G.nodes[node].get("name", f"User {node}"),
                        "predicted_activity": float(score),
                        "degree": G.degree(node)
                    })
                results.sort(key=lambda x: x["predicted_activity"], reverse=True)
                results = results[:top_k]
        
        return results
    
    except Exception as e:
        print(f"Error predicting user activity: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error predicting user activity: {str(e)}")

@router.get("/history")
async def get_analysis_history(db: Session = Depends(get_db)):
    """
    Get the history of analyses performed.
    
    Returns:
        list: Analysis history items.
    """
    try:
        # Query the database for analysis history
        history_items = db.query(AnalysisHistory).order_by(AnalysisHistory.created_at.desc()).limit(20).all()
        
        # Format the results
        result = []
        for item in history_items:
            result.append({
                "id": item.id,
                "type": item.analysis_type,
                "algorithm": item.algorithm,
                "parameters": item.parameters,
                "date": item.created_at.isoformat()
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve analysis history: {str(e)}") 