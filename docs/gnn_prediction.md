# GNN-Based Link Prediction

This documentation covers the Graph Neural Network (GNN) based link prediction feature in the Social Network Analysis System.

## Overview

The link prediction feature uses Graph Neural Networks to predict potential new connections in a social network. It identifies pairs of nodes that are likely to form connections in the future based on the existing network structure.

## Technical Implementation

### Models

Our system implements two GNN models:

1. **GNNLinkPredictor**: A Graph Convolutional Network (GCN) based model that learns node embeddings and predicts link probabilities between node pairs.

2. **GNNUserBehaviorPredictor**: A Graph Attention Network (GAT) based model designed to predict user activity and behavior based on network structure.

### Architecture

The link prediction system follows this architecture:

1. **Data Processing**: NetworkX graphs are converted to PyTorch Geometric Data objects.
2. **Node Embedding**: GCN layers encode node features and graph structure into embeddings.
3. **Link Prediction**: A predictor module takes pairs of node embeddings and outputs a probability.
4. **Result Ranking**: Predicted links are ranked by probability score.

### API Endpoints

The system exposes the following API endpoint:

- **POST /api/analysis/predict-links**: Predicts potential new links in the provided network.
  - Request body: Network data in JSON format (nodes and edges)
  - Query parameters: `top_k` to specify the number of predictions to return
  - Response: Array of predicted links with source, target, and probability score

## Frontend Integration

The link prediction feature is integrated into the NetworkView component with the following UI elements:

1. **Prediction Button**: Triggers the link prediction process.
2. **Results Table**: Displays predicted links with their probability scores.
3. **Visualization**: Highlights nodes and shows potential links when selected.

## Usage

To use the link prediction feature:

1. Navigate to the Network View page.
2. Load your network data.
3. Click the "Predict Potential Links" button.
4. Review the predicted links in the table below the network visualization.
5. Click "View" on any prediction to highlight the nodes and visualize the potential connection.

## Performance Considerations

The GNN model training occurs on the server when predictions are requested. For large networks, this process may take time. The implementation includes:

- Node degree features as default if no other features are provided
- Sampling of negative examples during training for efficiency
- Limiting the number of epochs for faster inference

## Future Improvements

Planned enhancements to the link prediction feature:

1. Pre-trained models for faster inference
2. Additional node features for better predictions
3. Explainability features to understand prediction reasoning
4. Batch processing for large networks
5. Integration with user behavior prediction

## Dependencies

The link prediction feature relies on:

- torch
- torch-geometric
- networkx
- numpy 